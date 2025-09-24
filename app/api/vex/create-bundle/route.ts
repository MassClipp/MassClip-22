import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"
import { ConnectedStripeAccountsService } from "@/lib/connected-stripe-accounts-service"
import { getUserTierInfo, incrementUserBundles } from "@/lib/user-tier-service"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 [Vex Bundle Creation] Starting AI-powered bundle creation...")

    const body = await request.json()
    const { title, description, price, contentIds, bundleType } = body

    console.log("📝 [Vex Bundle Creation] Request data:", {
      title,
      description,
      price,
      contentIds: contentIds?.length || 0,
      bundleType,
    })

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")

    // Verify authentication
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Vex Bundle Creation] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Vex Bundle Creation] User authenticated:", userId)

    // Check bundle limits
    console.log("🔍 [Vex Bundle Creation] Checking bundle limits...")
    const tierInfo = await getUserTierInfo(userId)

    if (tierInfo.reachedBundleLimit) {
      console.warn("❌ [Vex Bundle Creation] Bundle limit reached")
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
          error: "Please connect and complete your Stripe account setup before creating bundles",
          code: "STRIPE_ACCOUNT_REQUIRED",
        },
        { status: 400 },
      )
    }

    const stripeAccountId = connectedAccount.stripe_user_id || connectedAccount.stripeAccountId

    // Validate required fields
    if (!title || !price) {
      return NextResponse.json({ error: "Missing required fields: title and price are required" }, { status: 400 })
    }

    // Get user's content analysis to find the specified content
    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    let selectedContent: any[] = []

    if (analysisDoc.exists() && contentIds && contentIds.length > 0) {
      const analysisData = analysisDoc.data()
      const allContent = analysisData?.detailedAnalysis || []

      // Find content by IDs
      selectedContent = allContent.filter(
        (content: any) => contentIds.includes(content.id) || contentIds.includes(content.title),
      )
    }

    // Process content items
    const processedContentItems = selectedContent.map((item: any, index: number) => ({
      id: item.id || `content_${index}`,
      title: item.title || `Content ${index + 1}`,
      description: item.description || "",
      fileUrl: item.fileUrl || item.downloadUrl || "",
      downloadUrl: item.downloadUrl || item.fileUrl || "",
      publicUrl: item.publicUrl || item.fileUrl || "",
      thumbnailUrl: item.thumbnailUrl || "",
      fileSize: item.fileSize || 0,
      fileSizeFormatted: item.fileSizeFormatted || formatFileSize(item.fileSize || 0),
      duration: item.duration || 0,
      durationFormatted: item.durationFormatted || "0:00",
      mimeType: item.mimeType || "video/mp4",
      format: item.format || "mp4",
      quality: item.quality || "HD",
      tags: item.tags || [],
      contentType: item.contentType || "video",
      createdAt: item.createdAt || new Date().toISOString(),
      uploadedAt: item.uploadedAt || new Date().toISOString(),
    }))

    // Calculate content metadata
    const totalSize = processedContentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const totalDuration = processedContentItems.reduce((sum, item) => sum + (item.duration || 0), 0)

    const contentMetadata = {
      totalItems: processedContentItems.length,
      totalSize: totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalDuration: totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      formats: [...new Set(processedContentItems.map((item) => item.format))],
      qualities: [...new Set(processedContentItems.map((item) => item.quality))],
      contentBreakdown: {
        videos: processedContentItems.filter((item) => item.contentType === "video").length,
        audios: processedContentItems.filter((item) => item.contentType === "audio").length,
        images: processedContentItems.filter((item) => item.contentType === "image").length,
        documents: processedContentItems.filter((item) => item.contentType === "document").length,
      },
    }

    // Create Stripe product
    console.log("🏪 [Vex Bundle Creation] Creating Stripe product...")
    const product = await stripe.products.create(
      {
        name: title,
        description: description || undefined,
        metadata: {
          bundleType: bundleType || "ai_created",
          creatorId: userId,
          contentCount: processedContentItems.length.toString(),
          createdBy: "vex_ai",
        },
      },
      { stripeAccount: stripeAccountId },
    )

    // Create Stripe price
    console.log("💰 [Vex Bundle Creation] Creating Stripe price...")
    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: "usd",
        metadata: {
          bundleType: bundleType || "ai_created",
          creatorId: userId,
          createdBy: "vex_ai",
        },
      },
      { stripeAccount: stripeAccountId },
    )

    // Create bundle document
    const bundleId = db.collection("bundles").doc().id
    const bundleData = {
      id: bundleId,
      title,
      description: description || "",
      price,
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
      detailedContentItems: processedContentItems,
      contentItems: processedContentItems.map((item) => item.id),
      contentMetadata,

      // Quick access arrays
      contentTitles: processedContentItems.map((item) => item.title),
      contentDescriptions: processedContentItems.map((item) => item.description),
      contentTags: processedContentItems.flatMap((item) => item.tags || []),
      contentThumbnails: processedContentItems.map((item) => item.thumbnailUrl).filter(Boolean),
      contentUrls: processedContentItems.map((item) => item.fileUrl).filter(Boolean),

      // Visual
      thumbnailUrl: processedContentItems[0]?.thumbnailUrl || "",
      coverImage: processedContentItems[0]?.thumbnailUrl || "",
      coverImageUrl: "",
      customPreviewThumbnail: "",

      // Status
      status: "active",
      active: true,
      isPublic: true,

      // AI metadata
      createdBy: "vex_ai",
      bundleType: bundleType || "ai_created",
      aiGenerated: true,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    }

    console.log("💾 [Vex Bundle Creation] Saving bundle to Firestore...")
    await db.collection("bundles").doc(bundleId).set(bundleData)

    // Increment user bundle count
    console.log("📊 [Vex Bundle Creation] Incrementing user bundle count...")
    await incrementUserBundles(userId)

    console.log("✅ [Vex Bundle Creation] AI bundle created successfully:", {
      bundleId,
      title,
      price,
      contentItems: processedContentItems.length,
    })

    return NextResponse.json({
      success: true,
      message: "Bundle created successfully by Vex AI",
      bundleId,
      bundle: {
        id: bundleId,
        title,
        description,
        price,
        stripeProductId: product.id,
        stripePriceId: stripePrice.id,
        contentItems: processedContentItems.length,
        totalSize: contentMetadata.totalSizeFormatted,
        createdBy: "vex_ai",
      },
    })
  } catch (error: any) {
    console.error("❌ [Vex Bundle Creation] Error:", error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe error occurred",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error.message,
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
