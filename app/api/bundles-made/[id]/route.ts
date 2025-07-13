import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [BundlesMade API] Fetching bundle: ${bundleId}`)

    // Get bundle from bundlesMade collection
    const bundleDoc = await db.collection("bundlesMade").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [BundlesMade API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [BundlesMade API] Found bundle: ${bundleData.title}`)

    const response = {
      id: bundleDoc.id,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.coverImage || null,
      customPreviewThumbnail: bundleData.coverImage,
      creatorId: bundleData.creatorId,
      creatorUsername: bundleData.creatorUsername || "",
      creatorName: bundleData.creatorName || "",
      price: bundleData.price || 0,
      currency: bundleData.currency || "usd",
      totalItems: bundleData.contentCount || 0,
      contentItems: bundleData.contentItems || [],
      contentTitles: bundleData.contentTitles || [],
      contentUrls: bundleData.contentUrls || [],
      totalDuration: bundleData.totalDuration || 0,
      totalSize: bundleData.totalSize || 0,
      contentBreakdown: bundleData.contentBreakdown || { videos: 0, audio: 0, images: 0, documents: 0 },
      createdAt: bundleData.createdAt,
      updatedAt: bundleData.updatedAt,
      active: bundleData.active !== false,
    }

    console.log(`✅ [BundlesMade API] Returning bundle data with ${response.totalItems} items`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`❌ [BundlesMade API] Error:`, error)
    return NextResponse.json({ error: "Failed to fetch bundle", details: error.message }, { status: 500 })
  }
}
