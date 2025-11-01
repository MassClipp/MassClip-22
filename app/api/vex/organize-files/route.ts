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
    console.error("Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileIds, targetFolderId, reason } = await request.json()

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "Invalid file IDs provided" }, { status: 400 })
    }

    console.log(`🔍 [Vex Organize] Moving ${fileIds.length} files to folder: ${targetFolderId}`)
    console.log(`📝 [Vex Organize] Reason: ${reason}`)

    // Validate target folder if not "main"
    if (targetFolderId && targetFolderId !== "main") {
      const folderRef = db.collection("folders").doc(targetFolderId)
      const folderDoc = await folderRef.get()

      if (!folderDoc.exists) {
        return NextResponse.json({ error: "Target folder not found" }, { status: 404 })
      }

      const folderData = folderDoc.data()
      if (folderData?.userId !== user.uid) {
        return NextResponse.json({ error: "Access denied to target folder" }, { status: 403 })
      }

      if (folderData?.isDeleted) {
        return NextResponse.json({ error: "Cannot move files to deleted folder" }, { status: 400 })
      }
    }

    const contentCollections = ["uploads", "productBoxContent", "free_content"]
    const batch = db.batch()
    const results = []
    const movedFiles = []

    for (const fileId of fileIds) {
      let found = false

      // Try to find the file in each collection
      for (const collectionName of contentCollections) {
        const docRef = db.collection(collectionName).doc(fileId)
        const docSnap = await docRef.get()

        if (docSnap.exists) {
          const docData = docSnap.data()

          // Verify ownership
          if (docData?.uid !== user.uid && docData?.userId !== user.uid) {
            results.push({ id: fileId, success: false, error: "Access denied" })
            found = true
            break
          }

          // Determine the folderId to set
          const finalFolderId = targetFolderId === "main" ? null : targetFolderId

          // Get folder name if we have a folder ID
          let folderName = null
          if (finalFolderId) {
            const folderDoc = await db.collection("folders").doc(finalFolderId).get()
            if (folderDoc.exists) {
              folderName = folderDoc.data()?.name
            }
          }

          batch.update(docRef, {
            folderId: finalFolderId,
            folderName: folderName,
            updatedAt: new Date(),
            vexOrganized: true,
            vexOrganizeReason: reason || "Organized by Vex AI",
          })

          movedFiles.push({
            id: fileId,
            filename: docData.filename || docData.title,
            previousFolder: docData.folderId || "main",
            collection: collectionName,
          })

          results.push({ id: fileId, success: true, collection: collectionName })
          found = true
          break
        }
      }

      if (!found) {
        results.push({ id: fileId, success: false, error: "File not found in any collection" })
      }
    }

    // Commit the batch
    await batch.commit()

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    console.log(
      `✅ [Vex Organize] Successfully moved ${successCount} files${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
    )

    return NextResponse.json({
      success: true,
      message: `Vex organized ${successCount} files successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
      results,
      movedFiles,
      summary: {
        totalProcessed: fileIds.length,
        successful: successCount,
        failed: failureCount,
        targetFolder: targetFolderId,
        reason: reason,
      },
    })
  } catch (error) {
    console.error("❌ [Vex Organize] Error organizing files:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
