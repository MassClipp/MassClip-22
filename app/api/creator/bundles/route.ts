import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"
import { getConnectedStripeAccount } from "@/lib/connected-stripe-accounts-service"

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

// GET method to fetch user's bundles
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Bundles] Fetching user bundles...")

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
      console.error("❌ [Bundles] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Bundles] User authenticated:", userId)

    // Query bundles collection for user's bundles
    const bundlesQuery = db.collection("bundles").where("creatorId", "==", userId)
    const bundlesSnapshot = await bundlesQuery.get()

    const bundles: any[] = []

    bundlesSnapshot.forEach((doc) => {
      const data = doc.data()
      bundles.push({
        id: doc.id,
        title: data.title,
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        coverImage: data.coverImage || data.thumbnailUrl || data.coverImageUrl || "",
        active: data.active !== false, // Default to true if not specified
        contentItems: data.contentItems || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        productId: data.productId || data.stripeProductId,
        priceId: data.priceId || data.stripePriceId,
        stripeProductId: data.stripeProductId,
        stripePriceId: data.stripePriceId,
        contentMetadata: data.contentMetadata,
        detailedContentItems: data.detailedContentItems,
      })
    })

    // Sort by creation date (newest first)
    bundles.sort((a, b) => {
      const aTime = a.createdAt?.seconds || new Date(a.createdAt).getTime() / 1000 || 0
      const bTime = b.createdAt?.seconds || new Date(b.createdAt).getTime() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ [Bundles] Found ${bundles.length} bundles for user ${userId}`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error: any) {
    console.error("❌ [Bundles] Error fetching bundles:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// POST method to create new bundles
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Bundle Creation] Starting bundle creation...")

    const body = await request.json()
    const { title, description, price, billingType, thumbnailUrl, contentItems } = body

    console.log("📝 [Bundle Creation] Request data:", {
      title,
      description,
      price,
      billingType,
      thumbnailUrl,
      contentItemsCount: contentItems?.length || 0,
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
      console.error("❌ [Bundle Creation] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Bundle Creation] User authenticated:", userId)

    // Check if user has connected Stripe account
    const connectedAccount = await getConnectedStripeAccount(userId)
    if (!connectedAccount) {
      console.error("❌ [Bundle Creation] No connected Stripe account found for user:", userId)
      return NextResponse.json(
        {
          error: "Please connect your Stripe account before creating bundles",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      )
    }

    // Verify account is properly set up
    if (!connectedAccount.charges_enabled || !connectedAccount.details_submitted) {
      console.error("❌ [Bundle Creation] Stripe account setup incomplete:", {
        charges_enabled: connectedAccount.charges_enabled,
        details_submitted: connectedAccount.details_submitted,
      })
      return NextResponse.json(
        {
          error: "Please complete your Stripe account setup before creating bundles",
          code: "STRIPE_ACCOUNT_INCOMPLETE",
        },
        { status: 400 },
      )
    }

    const stripeAccountId = connectedAccount.stripe_user_id || connectedAccount.stripeAccountId

    console.log("✅ [Bundle Creation] Connected Stripe account verified:", {
      stripeAccountId,
      charges_enabled: connectedAccount.charges_enabled,
      details_submitted: connectedAccount.details_submitted,
    })

    // Validate required fields
    if (!title || !price) {
      return NextResponse.json(
        {
          error: "Missing required fields: title and price are required",
        },
        { status: 400 },
      )
    }

    // Create Stripe product
    console.log("🏪 [Bundle Creation] Creating Stripe product...")
    const product = await stripe.products.create(
      {
        name: title,
        description: description || "",
        metadata: {
          bundleType: "content_bundle",
          creatorId: userId,
          contentCount: (contentItems?.length || 0).toString(),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log("✅ [Bundle Creation] Stripe product created:", product.id)

    // Create Stripe price
    console.log("💰 [Bundle Creation] Creating Stripe price...")
    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: "usd",
        metadata: {
          bundleType: "content_bundle",
          creatorId: userId,
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log("✅ [Bundle Creation] Stripe price created:", stripePrice.id)

    // Process content items and calculate metadata
    const processedContentItems = (contentItems || []).map((item: any, index: number) => ({
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

    // Calculate content metadata with guaranteed non-undefined values
    const totalSize = processedContentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const totalDuration = processedContentItems.reduce((sum, item) => sum + (item.duration || 0), 0)

    const contentMetadata = {
      totalItems: processedContentItems.length || 0, // Ensure never undefined
      totalSize: totalSize || 0,
      totalSizeFormatted: formatFileSize(totalSize || 0),
      totalDuration: totalDuration || 0,
      totalDurationFormatted: formatDuration(totalDuration || 0),
      formats: [...new Set(processedContentItems.map((item) => item.format))],
      qualities: [...new Set(processedContentItems.map((item) => item.quality))],
      contentBreakdown: {
        videos: processedContentItems.filter((item) => item.contentType === "video").length || 0,
        audios: processedContentItems.filter((item) => item.contentType === "audio").length || 0,
        images: processedContentItems.filter((item) => item.contentType === "image").length || 0,
        documents: processedContentItems.filter((item) => item.contentType === "document").length || 0,
      },
      lastUpdated: new Date(),
    }

    // Create bundle document
    const bundleId = db.collection("bundles").doc().id
    const bundleData = {
      id: bundleId,
      title,
      description: description || "",
      price,
      currency: "usd",
      billingType: billingType || "one_time",
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
      contentItems: processedContentItems.map((item) => item.id), // Array of IDs for compatibility
      contentMetadata,

      // Quick access arrays
      contentTitles: processedContentItems.map((item) => item.title),
      contentDescriptions: processedContentItems.map((item) => item.description),
      contentTags: processedContentItems.flatMap((item) => item.tags || []),
      contentThumbnails: processedContentItems.map((item) => item.thumbnailUrl).filter(Boolean),
      contentUrls: processedContentItems.map((item) => item.fileUrl).filter(Boolean),

      // Visual
      thumbnailUrl: thumbnailUrl || processedContentItems[0]?.thumbnailUrl || "",
      coverImage: thumbnailUrl || processedContentItems[0]?.thumbnailUrl || "",
      coverImageUrl: thumbnailUrl || "",
      customPreviewThumbnail: thumbnailUrl || "",

      // Status
      status: "active",
      active: true,
      isPublic: true,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      contentLastUpdated: new Date(),
    }

    console.log("💾 [Bundle Creation] Saving bundle to Firestore...")
    await db.collection("bundles").doc(bundleId).set(bundleData)

    console.log("✅ [Bundle Creation] Bundle created successfully:", {
      bundleId,
      title,
      price,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
      contentItems: processedContentItems.length,
      totalSize: contentMetadata.totalSizeFormatted,
    })

    return NextResponse.json({
      success: true,
      message: "Bundle created successfully",
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
        thumbnailUrl,
      },
    })
  } catch (error: any) {
    console.error("❌ [Bundle Creation] Error:", error)

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
