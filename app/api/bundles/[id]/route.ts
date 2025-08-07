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
    console.log(`🔍 [Bundles API] Fetching bundle: ${bundleId}`)

    // Try to find the bundle in different collections
    const collections = ["productBoxes", "bundles", "creator_product_boxes"]
    let bundleData = null

    for (const collectionName of collections) {
      try {
        const docRef = db.collection(collectionName).doc(bundleId)
        const doc = await docRef.get()

        if (doc.exists) {
          bundleData = { id: doc.id, ...doc.data() }
          console.log(`✅ [Bundles API] Found bundle in ${collectionName}:`, bundleData)
          break
        }
      } catch (error) {
        console.warn(`⚠️ [Bundles API] Error checking ${collectionName}:`, error)
      }
    }

    if (!bundleData) {
      console.log(`❌ [Bundles API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Try to get content items count
    let totalItems = 0
    try {
      const contentRef = db.collection("productBoxContent").where("productBoxId", "==", bundleId)
      const contentSnapshot = await contentRef.get()
      totalItems = contentSnapshot.size
    } catch (error) {
      console.warn(`⚠️ [Bundles API] Error getting content count:`, error)
    }

    const response = {
      id: bundleData.id,
      title: bundleData.title || bundleData.name || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || bundleData.previewImage,
      customPreviewThumbnail: bundleData.customPreviewThumbnail,
      creatorId: bundleData.creatorId || bundleData.userId,
      creatorUsername: bundleData.creatorUsername || bundleData.username,
      price: bundleData.price || 0,
      currency: bundleData.currency || "usd",
      totalItems,
      createdAt: bundleData.createdAt,
      updatedAt: bundleData.updatedAt,
    }

    console.log(`✅ [Bundles API] Returning bundle data:`, response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`❌ [Bundles API] Error:`, error)
    return NextResponse.json({ error: "Failed to fetch bundle", details: error.message }, { status: 500 })
  }
}
