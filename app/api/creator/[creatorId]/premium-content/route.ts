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

    console.log(`🔍 [Premium Content API] Fetching premium content for creator: ${creatorId}`)

    // Query bundles collection for this creator
    const bundlesQuery = db.collection("bundles").where("creatorId", "==", creatorId).where("active", "==", true)
    const bundlesSnapshot = await bundlesQuery.get()

    console.log(`📦 [Premium Content API] Found ${bundlesSnapshot.docs.length} active bundles`)

    const premiumContent: any[] = []

    bundlesSnapshot.docs.forEach((doc) => {
      const data = doc.data()

      // Ensure we have the required Stripe integration fields
      const bundle = {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        type: "bundle",
        isPremium: true,

        // Thumbnail handling - prioritize different sources
        thumbnailUrl: data.coverImage || data.customPreviewThumbnail || data.thumbnail || null,

        // Content metadata
        contentCount: data.contentItems?.length || 0,
        contentItems: data.contentItems || [],

        // Stripe integration - CRITICAL for unlock functionality
        stripePriceId: data.priceId || null,
        stripeProductId: data.productId || null,

        // Additional metadata
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        active: data.active !== false,

        // Enhanced metadata if available
        contentMetadata: data.contentMetadata || null,
        detailedContentItems: data.detailedContentItems || [],
      }

      // Log bundle details for debugging
      console.log(`📋 [Premium Content API] Bundle ${doc.id}:`, {
        title: bundle.title,
        price: bundle.price,
        contentCount: bundle.contentCount,
        thumbnailUrl: bundle.thumbnailUrl,
        stripePriceId: bundle.stripePriceId,
        stripeProductId: bundle.stripeProductId,
        hasStripeIntegration: !!(bundle.stripePriceId && bundle.stripeProductId),
      })

      // Only include bundles that have proper Stripe integration
      if (bundle.stripePriceId && bundle.stripeProductId) {
        premiumContent.push(bundle)
      } else {
        console.warn(`⚠️ [Premium Content API] Bundle ${doc.id} missing Stripe integration:`, {
          stripePriceId: bundle.stripePriceId,
          stripeProductId: bundle.stripeProductId,
        })
      }
    })

    // Sort by creation date (newest first)
    premiumContent.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
      const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ [Premium Content API] Returning ${premiumContent.length} premium bundles with Stripe integration`)

    return NextResponse.json({
      success: true,
      content: premiumContent,
      count: premiumContent.length,
      metadata: {
        creatorId,
        totalBundles: bundlesSnapshot.docs.length,
        activeBundles: premiumContent.length,
        bundlesWithoutStripe: bundlesSnapshot.docs.length - premiumContent.length,
      },
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
