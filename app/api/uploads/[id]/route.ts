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

// PUT /api/uploads/[id] - Update upload (rename or public status)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { title, isPublicFree } = body

    console.log(`🔍 [Upload Update] Updating upload ${id} for user ${user.uid}`)
    console.log(`🔍 [Upload Update] New title: ${title}, isPublicFree: ${isPublicFree}`)

    // Check if upload exists and belongs to user
    const uploadRef = db.collection("uploads").doc(id)
    const uploadDoc = await uploadRef.get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()
    if (uploadData?.uid !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (title !== undefined) {
      updateData.title = title
    }

    if (isPublicFree !== undefined) {
      updateData.isPublicFree = isPublicFree
    }

    // Update the upload
    await uploadRef.update(updateData)

    // If title is being updated, cascade the change to related collections
    if (title !== undefined) {
      console.log(`🔄 [Upload Update] Cascading title update to related collections`)

      const batch = db.batch()
      const updatedCollections = []

      try {
        // 1. Update free_content collection
        const freeContentQuery = await db
          .collection("free_content")
          .where("uid", "==", user.uid)
          .where("originalId", "==", id)
          .get()

        freeContentQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title: title, updatedAt: new Date() })
          updatedCollections.push("free_content")
        })

        // 2. Update product_box_content collection (if content is in product boxes)
        const productBoxContentQuery = await db
          .collection("product_box_content")
          .where("uid", "==", user.uid)
          .where("originalId", "==", id)
          .get()

        productBoxContentQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title: title, updatedAt: new Date() })
          updatedCollections.push("product_box_content")
        })

        // 3. Update any other collections that might reference this content
        // Check for content in bundles
        const bundleContentQuery = await db
          .collection("bundle_content")
          .where("uid", "==", user.uid)
          .where("originalId", "==", id)
          .get()

        bundleContentQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title: title, updatedAt: new Date() })
          updatedCollections.push("bundle_content")
        })

        // 4. Update creator_uploads collection (if it exists)
        const creatorUploadsQuery = await db
          .collection("creator_uploads")
          .where("uid", "==", user.uid)
          .where("originalId", "==", id)
          .get()

        creatorUploadsQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title: title, updatedAt: new Date() })
          updatedCollections.push("creator_uploads")
        })

        // Commit all updates in a batch
        if (updatedCollections.length > 0) {
          await batch.commit()
          console.log(
            `✅ [Upload Update] Successfully updated title in collections: ${[...new Set(updatedCollections)].join(", ")}`,
          )
        } else {
          console.log(`ℹ️ [Upload Update] No related collections found to update`)
        }
      } catch (cascadeError) {
        console.error("❌ [Upload Update] Error cascading title update:", cascadeError)
        // Don't fail the main update if cascade fails
      }
    }

    console.log(`✅ [Upload Update] Successfully updated upload ${id}`)

    return NextResponse.json({
      success: true,
      message: title !== undefined ? "Title updated across all collections" : "Upload updated successfully",
    })
  } catch (error) {
    console.error("Error updating upload:", error)
    return NextResponse.json({ error: "Failed to update upload" }, { status: 500 })
  }
}

// DELETE /api/uploads/[id] - Delete upload
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    console.log(`🗑️ [Upload Delete] Deleting upload ${id} for user ${user.uid}`)

    // Check if upload exists and belongs to user
    const uploadRef = db.collection("uploads").doc(id)
    const uploadDoc = await uploadRef.get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()
    if (uploadData?.uid !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // TODO: Check if upload is being used in any product boxes
    // For now, we'll allow deletion but should warn user

    const batch = db.batch()
    const deletedCollections = []

    try {
      // Delete from uploads collection
      batch.delete(uploadRef)
      deletedCollections.push("uploads")

      // Delete from free_content collection
      const freeContentQuery = await db
        .collection("free_content")
        .where("uid", "==", user.uid)
        .where("originalId", "==", id)
        .get()

      freeContentQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCollections.push("free_content")
      })

      // Delete from product_box_content collection
      const productBoxContentQuery = await db
        .collection("product_box_content")
        .where("uid", "==", user.uid)
        .where("originalId", "==", id)
        .get()

      productBoxContentQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCollections.push("product_box_content")
      })

      // Delete from bundle_content collection
      const bundleContentQuery = await db
        .collection("bundle_content")
        .where("uid", "==", user.uid)
        .where("originalId", "==", id)
        .get()

      bundleContentQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCollections.push("bundle_content")
      })

      // Delete from creator_uploads collection
      const creatorUploadsQuery = await db
        .collection("creator_uploads")
        .where("uid", "==", user.uid)
        .where("originalId", "==", id)
        .get()

      creatorUploadsQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCollections.push("creator_uploads")
      })

      // Commit all deletions
      await batch.commit()

      console.log(
        `✅ [Upload Delete] Successfully deleted from collections: ${[...new Set(deletedCollections)].join(", ")}`,
      )
    } catch (cascadeError) {
      console.error("❌ [Upload Delete] Error cascading delete:", cascadeError)
      // Still delete the main upload even if cascade fails
      await uploadRef.delete()
    }

    // TODO: Optionally delete the file from Cloudflare R2
    // This would require additional logic to clean up storage

    return NextResponse.json({
      success: true,
      message: "Upload and all references deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting upload:", error)
    return NextResponse.json({ error: "Failed to delete upload" }, { status: 500 })
  }
}
