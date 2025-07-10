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

    // Check authorization
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to find bundle in multiple collections
    const collections = ["product-boxes", "bundles", "creator-bundles"]
    let bundleData = null
    let contentItems = []

    for (const collectionName of collections) {
      try {
        console.log(`🔍 [Bundles API] Checking collection: ${collectionName}`)

        const bundleRef = db.collection(collectionName).doc(bundleId)
        const bundleDoc = await bundleRef.get()

        if (bundleDoc.exists) {
          bundleData = {
            id: bundleDoc.id,
            ...bundleDoc.data(),
          }
          console.log(`✅ [Bundles API] Found bundle in ${collectionName}:`, bundleData.title)

          // Try to fetch content items from subcollection
          try {
            const contentRef = bundleRef.collection("content")
            const contentSnapshot = await contentRef.get()

            contentItems = contentSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))

            console.log(`📁 [Bundles API] Found ${contentItems.length} content items`)
          } catch (contentError) {
            console.warn(`⚠️ [Bundles API] Error fetching content:`, contentError)
          }

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

    // If no content items found in subcollection, try to get from bundle data
    if (contentItems.length === 0 && bundleData.contentItems) {
      contentItems = bundleData.contentItems
    }

    return NextResponse.json({
      bundle: bundleData,
      contentItems: contentItems,
      title: bundleData.title,
      description: bundleData.description,
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail,
      creatorUsername: bundleData.creatorUsername,
      totalItems: contentItems.length,
    })
  } catch (error) {
    console.error("❌ [Bundles API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch bundle" }, { status: 500 })
  }
}
