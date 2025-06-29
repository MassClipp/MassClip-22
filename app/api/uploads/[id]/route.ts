import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    initializeFirebaseAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { title, description, tags, category, isFree } = body

    console.log(`[Upload Update] Updating upload ${params.id} for user ${userId}`)

    // Get the current upload data
    const uploadRef = db.collection("uploads").doc(params.id)
    const uploadDoc = await uploadRef.get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const currentData = uploadDoc.data()

    // Verify ownership
    if (currentData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const oldTitle = currentData?.title
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (tags !== undefined) updateData.tags = tags
    if (category !== undefined) updateData.category = category
    if (isFree !== undefined) updateData.isFree = isFree

    updateData.updatedAt = new Date()

    // Update the main upload document
    await uploadRef.update(updateData)

    // If title changed, cascade the update to related collections
    if (title && title !== oldTitle) {
      console.log(`[Upload Update] Title changed from "${oldTitle}" to "${title}", cascading updates...`)

      const batch = db.batch()
      const updatedCollections = []

      try {
        // Update free_content collection
        const freeContentQuery = await db.collection("free_content").where("uploadId", "==", params.id).get()

        freeContentQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title, updatedAt: new Date() })
        })

        if (!freeContentQuery.empty) {
          updatedCollections.push(`free_content (${freeContentQuery.size} items)`)
        }

        // Update product_box_content collection
        const productBoxContentQuery = await db
          .collection("product_box_content")
          .where("uploadId", "==", params.id)
          .get()

        productBoxContentQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title, updatedAt: new Date() })
        })

        if (!productBoxContentQuery.empty) {
          updatedCollections.push(`product_box_content (${productBoxContentQuery.size} items)`)
        }

        // Update bundle_content collection
        const bundleContentQuery = await db.collection("bundle_content").where("uploadId", "==", params.id).get()

        bundleContentQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title, updatedAt: new Date() })
        })

        if (!bundleContentQuery.empty) {
          updatedCollections.push(`bundle_content (${bundleContentQuery.size} items)`)
        }

        // Update creator_uploads collection
        const creatorUploadsQuery = await db.collection("creator_uploads").where("uploadId", "==", params.id).get()

        creatorUploadsQuery.docs.forEach((doc) => {
          batch.update(doc.ref, { title, updatedAt: new Date() })
        })

        if (!creatorUploadsQuery.empty) {
          updatedCollections.push(`creator_uploads (${creatorUploadsQuery.size} items)`)
        }

        // Commit all updates
        await batch.commit()

        console.log(`[Upload Update] Successfully updated title in: ${updatedCollections.join(", ")}`)
      } catch (cascadeError) {
        console.error("[Upload Update] Error cascading title update:", cascadeError)
        // Don't fail the main update if cascade fails
      }
    }

    // Get updated data
    const updatedDoc = await uploadRef.get()
    const updatedData = updatedDoc.data()

    console.log(`[Upload Update] Successfully updated upload ${params.id}`)

    return NextResponse.json({
      success: true,
      upload: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData?.createdAt?.toDate?.()?.toISOString(),
        updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString(),
      },
    })
  } catch (error) {
    console.error("[Upload Update] Error:", error)
    return NextResponse.json({ error: "Failed to update upload" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    initializeFirebaseAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`[Upload Delete] Deleting upload ${params.id} for user ${userId}`)

    // Get the upload data first
    const uploadRef = db.collection("uploads").doc(params.id)
    const uploadDoc = await uploadRef.get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()

    // Verify ownership
    if (uploadData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete from all related collections
    const batch = db.batch()
    const deletedCollections = []

    try {
      // Delete from free_content
      const freeContentQuery = await db.collection("free_content").where("uploadId", "==", params.id).get()

      freeContentQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      if (!freeContentQuery.empty) {
        deletedCollections.push(`free_content (${freeContentQuery.size} items)`)
      }

      // Delete from product_box_content
      const productBoxContentQuery = await db.collection("product_box_content").where("uploadId", "==", params.id).get()

      productBoxContentQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      if (!productBoxContentQuery.empty) {
        deletedCollections.push(`product_box_content (${productBoxContentQuery.size} items)`)
      }

      // Delete from bundle_content
      const bundleContentQuery = await db.collection("bundle_content").where("uploadId", "==", params.id).get()

      bundleContentQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      if (!bundleContentQuery.empty) {
        deletedCollections.push(`bundle_content (${bundleContentQuery.size} items)`)
      }

      // Delete from creator_uploads
      const creatorUploadsQuery = await db.collection("creator_uploads").where("uploadId", "==", params.id).get()

      creatorUploadsQuery.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      if (!creatorUploadsQuery.empty) {
        deletedCollections.push(`creator_uploads (${creatorUploadsQuery.size} items)`)
      }

      // Delete the main upload document
      batch.delete(uploadRef)

      // Commit all deletions
      await batch.commit()

      console.log(`[Upload Delete] Successfully deleted from: uploads, ${deletedCollections.join(", ")}`)
    } catch (cascadeError) {
      console.error("[Upload Delete] Error cascading delete:", cascadeError)
      throw cascadeError
    }

    return NextResponse.json({
      success: true,
      message: "Upload and all references deleted successfully",
    })
  } catch (error) {
    console.error("[Upload Delete] Error:", error)
    return NextResponse.json({ error: "Failed to delete upload" }, { status: 500 })
  }
}
