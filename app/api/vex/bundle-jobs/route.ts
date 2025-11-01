import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export const maxDuration = 30

// GET - Check job status
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const jobId = url.searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get job status
    const jobDoc = await db.collection("bundle_jobs").doc(jobId).get()

    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const jobData = jobDoc.data()!

    // Verify ownership
    if (jobData.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        status: jobData.status,
        progress: jobData.progress || 0,
        currentStep: jobData.currentStep || "",
        bundleId: jobData.bundleId || null,
        error: jobData.error || null,
        retryCount: jobData.retryCount || 0,
        maxRetries: jobData.maxRetries || 3,
        createdAt: jobData.createdAt,
        updatedAt: jobData.updatedAt,
        completedAt: jobData.completedAt || null,
      },
    })
  } catch (error) {
    console.error("❌ [Bundle Jobs] Error checking job status:", error)
    return NextResponse.json({ error: "Failed to check job status" }, { status: 500 })
  }
}

// POST - Create new bundle job
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { title, description, price, contentIds, category, tags } = await request.json()

    if (!title || !description || !price || !contentIds || !Array.isArray(contentIds)) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, price, contentIds" },
        { status: 400 },
      )
    }

    // Create job document
    const jobRef = db.collection("bundle_jobs").doc()
    const jobId = jobRef.id

    const jobData = {
      id: jobId,
      userId,
      status: "queued",
      progress: 0,
      currentStep: "Initializing...",
      bundleData: {
        title,
        description,
        price,
        contentIds,
        category: category || "Mixed Media",
        tags: tags || [],
      },
      retryCount: 0,
      maxRetries: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await jobRef.set(jobData)

    // Start processing immediately (in background)
    processBundle(jobId).catch((error) => {
      console.error(`❌ [Bundle Jobs] Background processing failed for job ${jobId}:`, error)
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: "Bundle creation job started",
    })
  } catch (error) {
    console.error("❌ [Bundle Jobs] Error creating job:", error)
    return NextResponse.json({ error: "Failed to create bundle job" }, { status: 500 })
  }
}

// Background processing function
async function processBundle(jobId: string) {
  const jobRef = db.collection("bundle_jobs").doc(jobId)

  try {
    console.log(`🚀 [Bundle Jobs] Starting background processing for job ${jobId}`)

    // Get job data
    const jobDoc = await jobRef.get()
    if (!jobDoc.exists) {
      throw new Error("Job not found")
    }

    const jobData = jobDoc.data()!
    const { userId, bundleData } = jobData

    // Update status to processing
    await jobRef.update({
      status: "processing",
      currentStep: "Checking bundle limits...",
      progress: 10,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Import required modules dynamically to avoid circular dependencies
    const { getUserTierInfo, incrementUserBundles } = await import("@/lib/user-tier-service")
    const { ConnectedStripeAccountsService } = await import("@/lib/connected-stripe-accounts-service")
    const Stripe = (await import("stripe")).default

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    })

    // Step 1: Check bundle limits
    const tierInfo = await getUserTierInfo(userId)
    if (tierInfo.reachedBundleLimit) {
      throw new Error(`Bundle limit reached. You've reached your limit of ${tierInfo.bundlesLimit} bundles.`)
    }

    await jobRef.update({
      currentStep: "Verifying Stripe account...",
      progress: 20,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Step 2: Get connected Stripe account
    const connectedAccount = await ConnectedStripeAccountsService.getAccount(userId)
    if (!connectedAccount || !ConnectedStripeAccountsService.isAccountFullySetup(connectedAccount)) {
      throw new Error("Please connect your Stripe account before creating bundles")
    }

    const stripeAccountId = connectedAccount.stripe_user_id || connectedAccount.stripeAccountId

    await jobRef.update({
      currentStep: "Processing content items...",
      progress: 30,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Step 3: Process content items
    const contentItems = []
    for (const contentId of bundleData.contentIds) {
      try {
        const contentDoc = await db.collection("uploads").doc(contentId).get()
        if (contentDoc.exists && contentDoc.data()?.userId === userId) {
          const contentData = contentDoc.data()!
          contentItems.push({
            id: contentId,
            title: contentData.title || contentData.filename || `Content ${contentItems.length + 1}`,
            description: contentData.description || "",
            fileUrl: contentData.url || contentData.downloadUrl || "",
            downloadUrl: contentData.downloadUrl || contentData.url || "",
            publicUrl: contentData.publicUrl || contentData.url || "",
            thumbnailUrl: contentData.thumbnailUrl || "",
            fileSize: contentData.size || 0,
            fileSizeFormatted: formatFileSize(contentData.size || 0),
            duration: contentData.duration || 0,
            durationFormatted: formatDuration(contentData.duration || 0),
            mimeType: contentData.mimeType || contentData.fileType || "video/mp4",
            format: contentData.format || getFormatFromMimeType(contentData.mimeType || contentData.fileType),
            quality: contentData.quality || "HD",
            tags: contentData.tags || [],
            contentType: getContentTypeFromMimeType(contentData.mimeType || contentData.fileType),
            createdAt: contentData.createdAt || contentData.uploadedAt || new Date().toISOString(),
            uploadedAt: contentData.uploadedAt || contentData.createdAt || new Date().toISOString(),
          })
        }
      } catch (error) {
        console.warn(`Failed to fetch content ${contentId}:`, error)
      }
    }

    if (contentItems.length === 0) {
      throw new Error("No valid content items found for the provided IDs")
    }

    await jobRef.update({
      currentStep: "Creating Stripe product...",
      progress: 50,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Step 4: Create Stripe product
    const product = await stripe.products.create(
      {
        name: bundleData.title,
        description: bundleData.description.trim(),
        metadata: {
          bundleType: "content_bundle",
          creatorId: userId,
          contentCount: contentItems.length.toString(),
          createdBy: "vex-ai",
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    await jobRef.update({
      currentStep: "Setting up pricing...",
      progress: 70,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Step 5: Create Stripe price
    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(bundleData.price * 100),
        currency: "usd",
        metadata: {
          bundleType: "content_bundle",
          creatorId: userId,
          createdBy: "vex-ai",
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    await jobRef.update({
      currentStep: "Finalizing bundle...",
      progress: 85,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Step 6: Calculate metadata and create bundle
    const totalSize = contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const totalDuration = contentItems.reduce((sum, item) => sum + (item.duration || 0), 0)

    const contentMetadata = {
      totalItems: contentItems.length,
      totalSize: totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalDuration: totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      formats: [...new Set(contentItems.map((item) => item.format))],
      qualities: [...new Set(contentItems.map((item) => item.quality))],
      contentBreakdown: {
        videos: contentItems.filter((item) => item.contentType === "video").length,
        audios: contentItems.filter((item) => item.contentType === "audio").length,
        images: contentItems.filter((item) => item.contentType === "image").length,
        documents: contentItems.filter((item) => item.contentType === "document").length,
      },
    }

    const bundleRef = db.collection("bundles").doc()
    const bundleId = bundleRef.id

    const bundleDocument = {
      id: bundleId,
      title: bundleData.title,
      description: bundleData.description || "",
      price: Number(bundleData.price),
      comparePrice: null,
      currency: "usd",
      billingType: "one_time",
      type: "one_time",

      // Creator info
      creatorId: userId,
      stripeAccountId: stripeAccountId,

      // Stripe product info
      stripeProductId: product.id,
      productId: product.id,
      stripePriceId: stripePrice.id,
      priceId: stripePrice.id,

      // Content
      detailedContentItems: contentItems,
      contentItems: contentItems.map((item) => item.id),
      contentMetadata,

      // Quick access arrays
      contentTitles: contentItems.map((item) => item.title),
      contentDescriptions: contentItems.map((item) => item.description),
      contentTags: contentItems.flatMap((item) => item.tags || []),
      contentThumbnails: contentItems.map((item) => item.thumbnailUrl).filter(Boolean),
      contentUrls: contentItems.map((item) => item.fileUrl).filter(Boolean),

      // Visual
      thumbnailUrl: contentItems[0]?.thumbnailUrl || "",
      coverImage: contentItems[0]?.thumbnailUrl || "",
      coverImageUrl: contentItems[0]?.thumbnailUrl || "",
      customPreviewThumbnail: contentItems[0]?.thumbnailUrl || "",

      // Status
      status: "active",
      active: true,
      isPublic: true,

      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      contentLastUpdated: FieldValue.serverTimestamp(),

      // Vex specific
      createdBy: "vex-ai",
      category: bundleData.category || "Mixed Media",
      tags: bundleData.tags || [],
      totalSales: 0,
      totalRevenue: 0,
    }

    await bundleRef.set(bundleDocument)

    // Step 7: Increment user bundle count
    await incrementUserBundles(userId)

    // Mark job as completed
    await jobRef.update({
      status: "completed",
      progress: 100,
      currentStep: "Bundle created successfully!",
      bundleId: bundleId,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`✅ [Bundle Jobs] Job ${jobId} completed successfully. Bundle ID: ${bundleId}`)
  } catch (error) {
    console.error(`❌ [Bundle Jobs] Job ${jobId} failed:`, error)

    // Get current retry count
    const jobDoc = await jobRef.get()
    const currentRetryCount = jobDoc.data()?.retryCount || 0
    const maxRetries = jobDoc.data()?.maxRetries || 3

    if (currentRetryCount < maxRetries) {
      // Retry the job
      await jobRef.update({
        status: "retrying",
        currentStep: `Retrying... (${currentRetryCount + 1}/${maxRetries})`,
        retryCount: currentRetryCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, currentRetryCount) * 1000 // 1s, 2s, 4s
      setTimeout(() => {
        processBundle(jobId).catch((retryError) => {
          console.error(`❌ [Bundle Jobs] Retry failed for job ${jobId}:`, retryError)
        })
      }, delay)
    } else {
      // Mark as failed after max retries
      await jobRef.update({
        status: "failed",
        currentStep: "Bundle creation failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  }
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

function getFormatFromMimeType(mimeType: string): string {
  if (!mimeType) return "mp4"
  if (mimeType.includes("video")) return mimeType.split("/")[1] || "mp4"
  if (mimeType.includes("audio")) return mimeType.split("/")[1] || "mp3"
  if (mimeType.includes("image")) return mimeType.split("/")[1] || "jpg"
  return "file"
}

function getContentTypeFromMimeType(mimeType: string): string {
  if (!mimeType) return "video"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
