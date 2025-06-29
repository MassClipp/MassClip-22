import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    initializeFirebaseAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`[Title Sync] Starting title synchronization for user ${userId}`)

    // Get all uploads for this user
    const uploadsQuery = await db.collection("uploads").where("userId", "==", userId).get()

    if (uploadsQuery.empty) {
      return NextResponse.json({
        success: true,
        message: "No uploads found",
        synced: 0,
      })
    }

    const batch = db.batch()
    let syncedCount = 0
    const syncResults = []

    for (const uploadDoc of uploadsQuery.docs) {
      const uploadData = uploadDoc.data()
      const uploadId = uploadDoc.id
      const correctTitle = uploadData.title

      if (!correctTitle) continue

      const uploadSyncResult = {
        uploadId,
        title: correctTitle,
        collections: [],
      }

      // Check and sync free_content
      const freeContentQuery = await db.collection("free_content").where("uploadId", "==", uploadId).get()

      for (const doc of freeContentQuery.docs) {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date() })
          uploadSyncResult.collections.push("free_content")
        }
      }

      // Check and sync product_box_content
      const productBoxContentQuery = await db.collection("product_box_content").where("uploadId", "==", uploadId).get()

      for (const doc of productBoxContentQuery.docs) {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date() })
          uploadSyncResult.collections.push("product_box_content")
        }
      }

      // Check and sync bundle_content
      const bundleContentQuery = await db.collection("bundle_content").where("uploadId", "==", uploadId).get()

      for (const doc of bundleContentQuery.docs) {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date() })
          uploadSyncResult.collections.push("bundle_content")
        }
      }

      // Check and sync creator_uploads
      const creatorUploadsQuery = await db.collection("creator_uploads").where("uploadId", "==", uploadId).get()

      for (const doc of creatorUploadsQuery.docs) {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date() })
          uploadSyncResult.collections.push("creator_uploads")
        }
      }

      if (uploadSyncResult.collections.length > 0) {
        syncResults.push(uploadSyncResult)
        syncedCount++
      }
    }

    // Commit all updates
    if (syncedCount > 0) {
      await batch.commit()
      console.log(`[Title Sync] Successfully synced ${syncedCount} uploads`)
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${syncedCount} uploads`,
      synced: syncedCount,
      details: syncResults,
    })
  } catch (error) {
    console.error("[Title Sync] Error:", error)
    return NextResponse.json({ error: "Failed to sync titles" }, { status: 500 })
  }
}
