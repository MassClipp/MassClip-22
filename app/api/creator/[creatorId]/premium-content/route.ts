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

    console.log(`📦 [Premium Content API] Found ${bundlesSnapshot.size} active bundles`)

    const premiumContent: any[] = []

    for (const doc of bundlesSnapshot.docs) {
      const data = doc.data()

      // Get the best available thumbnail URL with priority order
      const thumbnailUrl =
        data.customPreviewThumbnail || data.coverImage || data.coverImageUrl || data.thumbnailUrl || null

      console.log(`🖼️ [Premium Content API] Bundle ${doc.id} thumbnail URLs:`, {
        customPreviewThumbnail: data.customPreviewThumbnail,
        coverImage: data.coverImage,
        coverImageUrl: data.coverImageUrl,
        thumbnailUrl: data.thumbnailUrl,
        selectedUrl: thumbnailUrl,
      })

      const bundleItem = {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        thumbnailUrl: thumbnailUrl,
        customPreviewThumbnail: data.customPreviewThumbnail,
        coverImage: data.coverImage,
        coverImageUrl: data.coverImageUrl,
        type: "bundle",
        isPremium: true,
        contentCount: data.contentItems?.length || 0,
        stripePriceId: data.priceId || data.stripePriceId,
        stripeProductId: data.productId || data.stripeProductId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        active: data.active !== false,
      }

      premiumContent.push(bundleItem)

      console.log(`✅ [Premium Content API] Processed bundle: ${bundleItem.title}`, {
        id: bundleItem.id,
        thumbnailUrl: bundleItem.thumbnailUrl,
        price: bundleItem.price,
        contentCount: bundleItem.contentCount,
      })
    }

    // Sort by creation date (newest first)
    premiumContent.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
      const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`🎯 [Premium Content API] Returning ${premiumContent.length} premium content items`)

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
