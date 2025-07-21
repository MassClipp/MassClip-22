import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

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

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    console.log(`🎯 [Premium Content API] Fetching premium content for creator: ${creatorId}`)

    // Query bundles collection for this creator
    const bundlesRef = db.collection("bundles")
    const bundlesQuery = bundlesRef.where("creatorId", "==", creatorId).where("active", "==", true)
    const bundlesSnapshot = await bundlesQuery.get()

    console.log(`📦 [Premium Content API] Found ${bundlesSnapshot.docs.length} bundles`)

    const premiumContent: any[] = []

    for (const doc of bundlesSnapshot.docs) {
      const data = doc.data()

      console.log(`📦 [Premium Content API] Processing bundle: ${doc.id}`, {
        title: data.title,
        price: data.price,
        priceId: data.priceId,
        stripePriceId: data.stripePriceId,
        productId: data.productId,
        stripeProductId: data.stripeProductId,
        contentItems: data.contentItems?.length || 0,
      })

      // Get the correct price ID - check both possible field names
      const stripePriceId = data.priceId || data.stripePriceId
      const stripeProductId = data.productId || data.stripeProductId

      // Only include bundles that have proper Stripe integration
      if (!stripePriceId) {
        console.warn(`⚠️ [Premium Content API] Skipping bundle ${doc.id} - no Stripe price ID`)
        continue
      }

      // Get thumbnail URL with multiple fallback options
      const thumbnailUrl =
        data.coverImage ||
        data.customPreviewThumbnail ||
        data.thumbnail ||
        data.thumbnailUrl ||
        (data.contentThumbnails && data.contentThumbnails.length > 0 ? data.contentThumbnails[0] : null)

      console.log(`🖼️ [Premium Content API] Thumbnail for ${doc.id}:`, {
        coverImage: data.coverImage,
        customPreviewThumbnail: data.customPreviewThumbnail,
        thumbnail: data.thumbnail,
        thumbnailUrl: data.thumbnailUrl,
        contentThumbnails: data.contentThumbnails?.length || 0,
        finalThumbnail: thumbnailUrl,
      })

      const bundleItem = {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        type: "bundle",
        isPremium: true,
        contentCount: data.contentItems?.length || 0,

        // Stripe integration - use consistent field names
        stripePriceId: stripePriceId,
        stripeProductId: stripeProductId,

        // Thumbnail with comprehensive fallbacks
        thumbnailUrl: thumbnailUrl,

        // Content metadata
        contentItems: data.contentItems || [],
        contentMetadata: data.contentMetadata || {},

        // Timestamps
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }

      console.log(`✅ [Premium Content API] Added bundle: ${doc.id}`, {
        title: bundleItem.title,
        stripePriceId: bundleItem.stripePriceId,
        thumbnailUrl: bundleItem.thumbnailUrl,
        contentCount: bundleItem.contentCount,
      })

      premiumContent.push(bundleItem)
    }

    // Sort by creation date (newest first)
    premiumContent.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
      const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ [Premium Content API] Returning ${premiumContent.length} premium content items`)

    return NextResponse.json({
      success: true,
      content: premiumContent,
      count: premiumContent.length,
    })
  } catch (error) {
    console.error("❌ [Premium Content API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch premium content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
