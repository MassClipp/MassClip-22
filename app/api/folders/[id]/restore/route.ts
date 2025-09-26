import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Folders API] Restoring folder: ${params.id}`)

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      // Verify the Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid

      // Get folder document
      const folderDoc = await db.collection("folders").doc(params.id).get()

      if (!folderDoc.exists) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 })
      }

      const folderData = folderDoc.data()

      // Check if user owns this folder
      if (folderData?.userId !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }

      // Check if folder is actually deleted
      if (!folderData?.isDeleted) {
        return NextResponse.json(
          {
            error: "Folder is not deleted",
            code: "NOT_DELETED",
          },
          { status: 400 },
        )
      }

      // Check if parent folder still exists and is not deleted
      if (folderData.parentId) {
        const parentDoc = await db.collection("folders").doc(folderData.parentId).get()
        if (!parentDoc.exists || parentDoc.data()?.isDeleted) {
          return NextResponse.json(
            {
              error: "Cannot restore folder: parent folder no longer exists or is deleted",
              code: "PARENT_UNAVAILABLE",
            },
            { status: 409 },
          )
        }
      }

      // Check for name conflicts in restore location
      let duplicateQuery = db
        .collection("folders")
        .where("userId", "==", userId)
        .where("name", "==", folderData.name)
        .where("isDeleted", "==", false)

      if (folderData.parentId) {
        duplicateQuery = duplicateQuery.where("parentId", "==", folderData.parentId)
      } else {
        duplicateQuery = duplicateQuery.where("parentId", "==", null)
      }

      const duplicateSnapshot = await duplicateQuery.get()
      if (!duplicateSnapshot.empty) {
        return NextResponse.json(
          {
            error: "A folder with this name already exists in the restore location",
            code: "DUPLICATE_NAME",
          },
          { status: 409 },
        )
      }

      const updates = {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      }

      await db.collection("folders").doc(params.id).update(updates)

      console.log(`✅ [Folders API] Successfully restored folder: ${params.id}`)
      return NextResponse.json({
        success: true,
        message: "Folder restored successfully",
        folder: {
          id: params.id,
          ...folderData,
          ...updates,
        },
      })
    } catch (authError) {
      console.error("❌ [Folders API] Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error(`❌ [Folders API] Error restoring folder ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Failed to restore folder",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
