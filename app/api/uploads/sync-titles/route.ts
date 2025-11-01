import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      return null
    }

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Auth verification error:", error)
    return null
  }
}

// POST /api/uploads/sync-titles - Sync titles across all collections for a user
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔄 [Title Sync] Starting title sync for user ${user.uid}`)

    // Get all uploads for the user
    const uploadsSnapshot = await db.collection("uploads").where("uid", "==", user.uid).get()

    if (uploadsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No uploads found to sync",
        syncedCount: 0,
      })
    }

    const batch = db.batch()
    let syncedCount = 0
    const collections = ["free_content", "product_box_content", "bundle_content", "creator_uploads"]

    // For each upload, sync its title to all related collections
    for (const uploadDoc of uploadsSnapshot.docs) {
      const uploadData = uploadDoc.data()
      const uploadId = uploadDoc.id
      const currentTitle = uploadData.title

      if (!currentTitle) continue

      console.log(`🔄 [Title Sync] Syncing title for upload ${uploadId}: "${currentTitle}"`)

      // Update each collection
      for (const collectionName of collections) {
        try {
          const relatedQuery = await db
            .collection(collectionName)
            .where("uid", "==", user.uid)
            .where("originalId", "==", uploadId)
            .get()

          relatedQuery.docs.forEach((doc) => {
            const currentData = doc.data()
            if (currentData.title !== currentTitle) {
              batch.update(doc.ref, {
                title: currentTitle,
                updatedAt: new Date(),
                syncedAt: new Date(),
              })
              syncedCount++
              console.log(
                `📝 [Title Sync] Updating ${collectionName}/${doc.id}: "${currentData.title}" → "${currentTitle}"`,
              )
            }
          })
        } catch (error) {
          console.error(`❌ [Title Sync] Error syncing to ${collectionName}:`, error)
        }
      }
    }

    if (syncedCount > 0) {
      await batch.commit()
      console.log(`✅ [Title Sync] Successfully synced ${syncedCount} titles`)
    } else {
      console.log(`ℹ️ [Title Sync] All titles are already in sync`)
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} titles across all collections`,
      syncedCount,
    })
  } catch (error) {
    console.error("❌ [Title Sync] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to sync titles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
