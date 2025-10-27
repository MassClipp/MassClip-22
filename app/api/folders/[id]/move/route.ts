import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Folders API] Moving folder: ${params.id}`)

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

      // Parse request body
      const body = await request.json()
      const { targetParentId } = body

      // Get source folder
      const sourceDoc = await db.collection("folders").doc(params.id).get()
      if (!sourceDoc.exists) {
        return NextResponse.json({ error: "Source folder not found" }, { status: 404 })
      }

      const sourceData = sourceDoc.data()
      if (sourceData?.userId !== userId) {
        return NextResponse.json({ error: "Access denied to source folder" }, { status: 403 })
      }

      // Validate target parent folder
      let targetParentPath = ""
      if (targetParentId && targetParentId !== "root") {
        const targetDoc = await db.collection("folders").doc(targetParentId).get()
        if (!targetDoc.exists) {
          return NextResponse.json({ error: "Target parent folder not found" }, { status: 404 })
        }

        const targetData = targetDoc.data()
        if (targetData?.userId !== userId) {
          return NextResponse.json({ error: "Access denied to target folder" }, { status: 403 })
        }

        if (targetData?.isDeleted) {
          return NextResponse.json({ error: "Cannot move to deleted folder" }, { status: 400 })
        }

        // Prevent moving folder into itself or its descendants
        if (targetData.path?.startsWith(sourceData.path)) {
          return NextResponse.json(
            {
              error: "Cannot move folder into itself or its descendants",
              code: "CIRCULAR_REFERENCE",
            },
            { status: 400 },
          )
        }

        targetParentPath = targetData.path || ""
      }

      // Check for name conflicts in target location
      let duplicateQuery = db
        .collection("folders")
        .where("userId", "==", userId)
        .where("name", "==", sourceData.name)
        .where("isDeleted", "==", false)

      if (targetParentId && targetParentId !== "root") {
        duplicateQuery = duplicateQuery.where("parentId", "==", targetParentId)
      } else {
        duplicateQuery = duplicateQuery.where("parentId", "==", null)
      }

      const duplicateSnapshot = await duplicateQuery.get()
      const hasDuplicate = duplicateSnapshot.docs.some((doc) => doc.id !== params.id)

      if (hasDuplicate) {
        return NextResponse.json(
          {
            error: "A folder with this name already exists in the target location",
            code: "DUPLICATE_NAME",
          },
          { status: 409 },
        )
      }

      // Calculate new path
      const newPath = targetParentPath ? `${targetParentPath}/${sourceData.name}` : `/${sourceData.name}`

      const updates = {
        parentId: targetParentId && targetParentId !== "root" ? targetParentId : null,
        path: newPath,
        updatedAt: new Date(),
      }

      await db.collection("folders").doc(params.id).update(updates)

      // TODO: Update paths of all descendant folders in a batch operation
      // This is a complex operation that should be handled separately for large folder trees

      console.log(`✅ [Folders API] Successfully moved folder: ${params.id}`)
      return NextResponse.json({
        success: true,
        message: "Folder moved successfully",
        folder: {
          id: params.id,
          ...sourceData,
          ...updates,
        },
      })
    } catch (authError) {
      console.error("❌ [Folders API] Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error(`❌ [Folders API] Error moving folder ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Failed to move folder",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
