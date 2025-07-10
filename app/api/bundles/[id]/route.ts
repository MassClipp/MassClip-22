import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
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
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const bundleId = params.id

    console.log(`🔍 [Bundles API] Fetching bundle ${bundleId} for user ${userId}`)

    // Try to find the bundle in different collections
    const collections = ["bundles", "product_boxes", "productBoxes"]
    let bundleData = null

    for (const collectionName of collections) {
      try {
        const bundleDoc = await db.collection(collectionName).doc(bundleId).get()

        if (bundleDoc.exists) {
          bundleData = {
            id: bundleDoc.id,
            ...bundleDoc.data(),
          }
          console.log(`✅ [Bundles API] Found bundle in ${collectionName}`)
          break
        }
      } catch (error) {
        console.warn(`⚠️ [Bundles API] Error checking ${collectionName}:`, error)
      }
    }

    if (!bundleData) {
      console.log(`❌ [Bundles API] Bundle ${bundleId} not found`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Return bundle data
    const response = {
      id: bundleData.id,
      title: bundleData.title || bundleData.bundleTitle || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail,
      customPreviewThumbnail: bundleData.customPreviewThumbnail,
      creatorUsername: bundleData.creatorUsername || bundleData.creator?.username || "Unknown",
      creatorId: bundleData.creatorId || bundleData.creator?.id,
      totalItems: bundleData.totalItems || bundleData.itemCount || 0,
      price: bundleData.price || 0,
      currency: bundleData.currency || "usd",
      createdAt: bundleData.createdAt,
      updatedAt: bundleData.updatedAt,
    }

    console.log(`✅ [Bundles API] Returning bundle data:`, response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundles API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
