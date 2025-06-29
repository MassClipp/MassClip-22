import { type NextRequest, NextResponse } from "next/server"
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase-server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const uploadDoc = await getDoc(doc(db, "uploads", params.id))
    if (!uploadDoc.exists()) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()
    if (uploadData.uid !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      id: uploadDoc.id,
      ...uploadData,
    })
  } catch (error) {
    console.error("Error fetching upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, tags, category } = body

    // Get the current upload
    const uploadRef = doc(db, "uploads", params.id)
    const uploadDoc = await getDoc(uploadRef)

    if (!uploadDoc.exists()) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()
    if (uploadData.uid !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const batch = writeBatch(db)
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (tags !== undefined) updateData.tags = tags
    if (category !== undefined) updateData.category = category

    updateData.updatedAt = new Date().toISOString()

    // Update the main upload document
    batch.update(uploadRef, updateData)

    // If title is being updated, cascade the change to related collections
    if (title !== undefined && title !== uploadData.title) {
      console.log(
        `🔄 [Upload Update] Cascading title change from "${uploadData.title}" to "${title}" for upload ${params.id}`,
      )

      // Update in free_content collection
      const freeContentQuery = query(collection(db, "free_content"), where("uploadId", "==", params.id))
      const freeContentDocs = await getDocs(freeContentQuery)
      freeContentDocs.forEach((doc) => {
        batch.update(doc.ref, { title, updatedAt: new Date().toISOString() })
      })
      console.log(`📝 Updated ${freeContentDocs.size} free_content documents`)

      // Update in product_box_content collection
      const productBoxContentQuery = query(collection(db, "product_box_content"), where("uploadId", "==", params.id))
      const productBoxContentDocs = await getDocs(productBoxContentQuery)
      productBoxContentDocs.forEach((doc) => {
        batch.update(doc.ref, { title, updatedAt: new Date().toISOString() })
      })
      console.log(`📦 Updated ${productBoxContentDocs.size} product_box_content documents`)

      // Update in bundle_content collection
      const bundleContentQuery = query(collection(db, "bundle_content"), where("uploadId", "==", params.id))
      const bundleContentDocs = await getDocs(bundleContentQuery)
      bundleContentDocs.forEach((doc) => {
        batch.update(doc.ref, { title, updatedAt: new Date().toISOString() })
      })
      console.log(`🎁 Updated ${bundleContentDocs.size} bundle_content documents`)

      // Update in creator_uploads collection
      const creatorUploadsQuery = query(collection(db, "creator_uploads"), where("uploadId", "==", params.id))
      const creatorUploadsDocs = await getDocs(creatorUploadsQuery)
      creatorUploadsDocs.forEach((doc) => {
        batch.update(doc.ref, { title, updatedAt: new Date().toISOString() })
      })
      console.log(`👤 Updated ${creatorUploadsDocs.size} creator_uploads documents`)
    }

    // Commit all updates in a single batch
    await batch.commit()

    console.log(`✅ [Upload Update] Successfully updated upload ${params.id} and cascaded changes`)

    return NextResponse.json({
      id: params.id,
      ...uploadData,
      ...updateData,
    })
  } catch (error) {
    console.error("Error updating upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the upload to verify ownership
    const uploadRef = doc(db, "uploads", params.id)
    const uploadDoc = await getDoc(uploadRef)

    if (!uploadDoc.exists()) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()
    if (uploadData.uid !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const batch = writeBatch(db)

    // Delete the main upload document
    batch.delete(uploadRef)

    // Delete from all related collections
    const collections = ["free_content", "product_box_content", "bundle_content", "creator_uploads"]

    for (const collectionName of collections) {
      const relatedQuery = query(collection(db, collectionName), where("uploadId", "==", params.id))
      const relatedDocs = await getDocs(relatedQuery)
      relatedDocs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      console.log(`🗑️ Deleting ${relatedDocs.size} documents from ${collectionName}`)
    }

    // Commit all deletions
    await batch.commit()

    console.log(`✅ [Upload Delete] Successfully deleted upload ${params.id} and all references`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
