import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { ConnectedStripeAccountsService } from "@/lib/connected-stripe-accounts-service"
import { getUserTierInfo, incrementUserBundles } from "@/lib/user-tier-service"

// Initialize Firebase Admin
initializeFirebaseAdmin()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    console.log("🚀 [Vex Bundle Creation] API called")

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
        {
          error: "Missing required fields: title, description, price, contentIds",
        },
        { status: 400 },
      )
    }

    console.log(`🚀 [Vex Bundle Creation] Creating bundle for user ${userId}:`, {
      title,
      price,
      contentIds: contentIds.length,
    })

    // Check bundle limits
    const tierInfo = await getUserTierInfo(userId)
    if (tierInfo.reachedBundleLimit) {
      return NextResponse.json(
        {
          error: "Bundle limit reached",
          details: `You've reached your limit of ${tierInfo.bundlesLimit} bundles.`,
          code: "BUNDLE_LIMIT_REACHED",
        },
        { status: 403 },
      )
    }

    // Get connected Stripe account
    const connectedAccount = await ConnectedStripeAccountsService.getAccount(userId)
    if (!connectedAccount || !ConnectedStripeAccountsService.isAccountFullySetup(connectedAccount)) {
      return NextResponse.json(
        {
          error: "Please connect your Stripe account before creating bundles",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      )
    }

    const stripeAccountId = connectedAccount.stripe_user_id || connectedAccount.stripeAccountId

    const contentItems = []
    for (const contentId of contentIds) {
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
      return NextResponse.json({ error: "No valid content items found for the provided IDs" }, { status: 400 })
    }

    console.log("🏪 [Vex Bundle Creation] Creating Stripe product...")
    const product = await stripe.products.create(
      {
        name: title,
        description: description.trim(),
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

    console.log("💰 [Vex Bundle Creation] Creating Stripe price...")
    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(price * 100),
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

    const bundleData = {
      id: bundleId,
      title,
      description: description || "",
      price: Number(price),
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
      category: category || "Mixed Media",
      tags: tags || [],
      totalSales: 0,
      totalRevenue: 0,
    }

    await bundleRef.set(bundleData)

    await incrementUserBundles(userId)

    console.log(`✅ [Vex Bundle Creation] Bundle created successfully: ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundleId,
      message: "Bundle created successfully",
      bundle: {
        id: bundleId,
        title,
        description,
        price,
        stripeProductId: product.id,
        stripePriceId: stripePrice.id,
        contentItems: contentItems.length,
        totalSize: contentMetadata.totalSizeFormatted,
        thumbnailUrl: bundleData.thumbnailUrl,
      },
    })
  } catch (error) {
    console.error("❌ [Vex Bundle Creation] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

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
