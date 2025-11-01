import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Folders API] Fetching folder: ${params.id}`)

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
        console.log(`❌ [Folders API] Folder not found: ${params.id}`)
        return NextResponse.json({ error: "Folder not found" }, { status: 404 })
      }

      const folderData = folderDoc.data()

      // Check if user owns this folder
      if (folderData?.userId !== userId) {
        console.log(`❌ [Folders API] Access denied for user ${userId} to folder ${params.id}`)
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }

      // Get additional folder statistics
      const [childFoldersSnapshot, filesSnapshot] = await Promise.all([
        // Count child folders
        db
          .collection("folders")
          .where("parentId", "==", params.id)
          .where("isDeleted", "==", false)
          .get(),
        // Count files in this folder
        db
          .collection("uploads")
          .where("uid", "==", userId)
          .where("folderId", "==", params.id)
          .get(),
      ])

      const folder = {
        id: folderDoc.id,
        name: folderData.name,
        userId: folderData.userId,
        parentId: folderData.parentId,
        path: folderData.path,
        color: folderData.color,
        description: folderData.description,
        isDeleted: folderData.isDeleted,
        createdAt: folderData.createdAt,
        updatedAt: folderData.updatedAt,
        // Computed fields
        hasChildren: childFoldersSnapshot.size > 0,
        fileCount: filesSnapshot.size,
        childFolderCount: childFoldersSnapshot.size,
      }

      console.log(`✅ [Folders API] Successfully fetched folder: ${params.id}`)
      return NextResponse.json({
        success: true,
        folder,
      })
    } catch (authError) {
      console.error("❌ [Folders API] Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error(`❌ [Folders API] Error fetching folder ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch folder",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Folders API] Updating folder: ${params.id}`)

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

      // Parse request body
      const body = await request.json()
      const { name, color, description, parentId } = body

      const updates: any = {
        updatedAt: new Date(),
      }

      // Update name if provided
      if (name !== undefined) {
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return NextResponse.json(
            {
              error: "Folder name is required",
              code: "INVALID_NAME",
            },
            { status: 400 },
          )
        }

        if (name.trim().length > 100) {
          return NextResponse.json(
            {
              error: "Folder name is too long",
              details: `Name must be 100 characters or less (current: ${name.trim().length})`,
              code: "NAME_TOO_LONG",
            },
            { status: 400 },
          )
        }

        // Check for duplicate names in the same parent (if name is changing)
        if (name.trim() !== folderData.name) {
          let duplicateQuery = db
            .collection("folders")
            .where("userId", "==", userId)
            .where("name", "==", name.trim())
            .where("isDeleted", "==", false)

          const currentParentId = parentId !== undefined ? parentId : folderData.parentId
          if (currentParentId && currentParentId !== "root") {
            duplicateQuery = duplicateQuery.where("parentId", "==", currentParentId)
          } else {
            duplicateQuery = duplicateQuery.where("parentId", "==", null)
          }

          const duplicateSnapshot = await duplicateQuery.get()
          const hasDuplicate = duplicateSnapshot.docs.some((doc) => doc.id !== params.id)

          if (hasDuplicate) {
            return NextResponse.json(
              {
                error: "A folder with this name already exists in this location",
                code: "DUPLICATE_NAME",
              },
              { status: 409 },
            )
          }
        }

        updates.name = name.trim()
      }

      // Update color if provided
      if (color !== undefined) {
        updates.color = color || null
      }

      // Update description if provided
      if (description !== undefined) {
        updates.description = description?.trim() || null
      }

      // Handle parent folder change (move operation)
      if (parentId !== undefined && parentId !== folderData.parentId) {
        // Validate new parent folder
        let newParentPath = ""
        if (parentId && parentId !== "root") {
          const parentDoc = await db.collection("folders").doc(parentId).get()
          if (!parentDoc.exists) {
            return NextResponse.json(
              {
                error: "Parent folder not found",
                code: "PARENT_NOT_FOUND",
              },
              { status: 404 },
            )
          }

          const parentData = parentDoc.data()
          if (parentData?.userId !== userId) {
            return NextResponse.json(
              {
                error: "Access denied to parent folder",
                code: "ACCESS_DENIED",
              },
              { status: 403 },
            )
          }

          if (parentData?.isDeleted) {
            return NextResponse.json(
              {
                error: "Cannot move folder to deleted parent",
                code: "PARENT_DELETED",
              },
              { status: 400 },
            )
          }

          // Prevent moving folder into itself or its descendants
          if (parentData.path?.startsWith(folderData.path)) {
            return NextResponse.json(
              {
                error: "Cannot move folder into itself or its descendants",
                code: "CIRCULAR_REFERENCE",
              },
              { status: 400 },
            )
          }

          newParentPath = parentData.path || ""
        }

        updates.parentId = parentId && parentId !== "root" ? parentId : null

        // Update path
        const newName = updates.name || folderData.name
        updates.path = newParentPath ? `${newParentPath}/${newName}` : `/${newName}`

        // TODO: Update paths of all descendant folders (this would require a batch operation)
        // For now, we'll handle this in a separate endpoint or background job
      } else if (updates.name && updates.name !== folderData.name) {
        // Update path if only name changed
        const pathParts = folderData.path.split("/")
        pathParts[pathParts.length - 1] = updates.name
        updates.path = pathParts.join("/")
      }

      // Update the folder
      await db.collection("folders").doc(params.id).update(updates)

      // Get updated folder data
      const updatedDoc = await db.collection("folders").doc(params.id).get()
      const updatedData = updatedDoc.data()

      const updatedFolder = {
        id: params.id,
        ...updatedData,
      }

      console.log(`✅ [Folders API] Successfully updated folder: ${params.id}`)
      return NextResponse.json({
        success: true,
        folder: updatedFolder,
        message: "Folder updated successfully",
      })
    } catch (authError) {
      console.error("❌ [Folders API] Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error(`❌ [Folders API] Error updating folder ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Failed to update folder",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Folders API] Deleting folder: ${params.id}`)

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

      // Check query parameters for delete behavior
      const { searchParams } = new URL(request.url)
      const permanent = searchParams.get("permanent") === "true"
      const force = searchParams.get("force") === "true"

      // Check if folder has children (unless force delete)
      if (!force) {
        const [childFoldersSnapshot, filesSnapshot] = await Promise.all([
          db.collection("folders").where("parentId", "==", params.id).where("isDeleted", "==", false).get(),
          db.collection("uploads").where("uid", "==", userId).where("folderId", "==", params.id).get(),
        ])

        if (childFoldersSnapshot.size > 0 || filesSnapshot.size > 0) {
          return NextResponse.json(
            {
              error: "Folder is not empty",
              details: `Folder contains ${childFoldersSnapshot.size} subfolders and ${filesSnapshot.size} files`,
              code: "FOLDER_NOT_EMPTY",
              childFolders: childFoldersSnapshot.size,
              files: filesSnapshot.size,
            },
            { status: 409 },
          )
        }
      }

      if (permanent) {
        // Permanent delete - remove from database
        await db.collection("folders").doc(params.id).delete()
        console.log(`✅ [Folders API] Permanently deleted folder: ${params.id}`)

        return NextResponse.json({
          success: true,
          message: "Folder permanently deleted",
          permanent: true,
        })
      } else {
        // Soft delete - mark as deleted
        await db.collection("folders").doc(params.id).update({
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        })

        console.log(`✅ [Folders API] Soft deleted folder: ${params.id}`)

        return NextResponse.json({
          success: true,
          message: "Folder moved to trash",
          permanent: false,
        })
      }
    } catch (authError) {
      console.error("❌ [Folders API] Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error(`❌ [Folders API] Error deleting folder ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Failed to delete folder",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
