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
    const collections = ["productBoxes", "bundles", "product-boxes"]
    let bundleData = null

    for (const collectionName of collections) {
      try {
        const doc = await db.collection(collectionName).doc(bundleId).get()
        if (doc.exists) {
          bundleData = { id: doc.id, ...doc.data() }
          console.log(`✅ [Bundles API] Found bundle in ${collectionName}`)
          break
        }
      } catch (error) {
        console.warn(`⚠️ [Bundles API] Error checking ${collectionName}:`, error)
      }
    }

    if (!bundleData) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Fetch content items for this bundle
    const contentItems = []

    // Try to get content from productBoxContent collection
    try {
      const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", bundleId).get()

      contentQuery.forEach((doc) => {
        contentItems.push({ id: doc.id, ...doc.data() })
      })

      // If no content found, try with boxId field
      if (contentItems.length === 0) {
        const boxIdQuery = await db.collection("productBoxContent").where("boxId", "==", bundleId).get()

        boxIdQuery.forEach((doc) => {
          contentItems.push({ id: doc.id, ...doc.data() })
        })
      }

      // If still no content, try uploads collection
      if (contentItems.length === 0) {
        const uploadsQuery = await db.collection("uploads").where("productBoxId", "==", bundleId).get()

        uploadsQuery.forEach((doc) => {
          contentItems.push({ id: doc.id, ...doc.data() })
        })
      }

      // If still no content, check bundle's contentItems array
      if (contentItems.length === 0 && bundleData.contentItems) {
        for (const itemId of bundleData.contentItems) {
          try {
            const uploadDoc = await db.collection("uploads").doc(itemId).get()
            if (uploadDoc.exists) {
              contentItems.push({ id: uploadDoc.id, ...uploadDoc.data() })
            }
          } catch (error) {
            console.warn(`⚠️ [Bundles API] Error fetching upload ${itemId}:`, error)
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Bundles API] Error fetching content:`, error)
    }

    console.log(`✅ [Bundles API] Found ${contentItems.length} content items`)

    return NextResponse.json({
      bundle: bundleData,
      contentItems,
    })
  } catch (error: any) {
    console.error("❌ [Bundles API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch bundle", details: error.message }, { status: 500 })
  }
}
