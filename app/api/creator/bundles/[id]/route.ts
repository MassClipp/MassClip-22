import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

// Initialize Firebase Admin
if (!db || !auth) {
  throw new Error("Firebase Admin SDK not initialized")
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id

    // Get bundle document
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    // Verify ownership
    const userRecord = await auth.getUserByEmail(session.user.email)
    if (bundleData?.creatorId !== userRecord.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get content items for this bundle
    const contentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

    const contentItems = contentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const bundle = {
      id: bundleDoc.id,
      ...bundleData,
      contentItems,
      contentCount: contentItems.length,
      createdAt: bundleData?.createdAt?.toDate?.() || new Date(),
      updatedAt: bundleData?.updatedAt?.toDate?.() || new Date(),
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error("Error fetching bundle:", error)
    return NextResponse.json({ error: "Failed to fetch bundle" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    const body = await request.json()

    // Get bundle document to verify ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    const userRecord = await auth.getUserByEmail(session.user.email)

    if (bundleData?.creatorId !== userRecord.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update bundle
    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await db.collection("bundles").doc(bundleId).update(updateData)

    // Get updated bundle with content
    const updatedDoc = await db.collection("bundles").doc(bundleId).get()
    const updatedData = updatedDoc.data()

    const contentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

    const contentItems = contentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const updatedBundle = {
      id: bundleId,
      ...updatedData,
      contentItems,
      contentCount: contentItems.length,
      createdAt: updatedData?.createdAt?.toDate?.() || new Date(),
      updatedAt: updatedData?.updatedAt?.toDate?.() || new Date(),
    }

    return NextResponse.json({ bundle: updatedBundle })
  } catch (error) {
    console.error("Error updating bundle:", error)
    return NextResponse.json({ error: "Failed to update bundle" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    const body = await request.json()
    const { action, uploadId } = body

    // Get bundle document to verify ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    const userRecord = await auth.getUserByEmail(session.user.email)

    if (bundleData?.creatorId !== userRecord.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (action === "add_content" && uploadId) {
      // Get upload document to verify it exists and belongs to the user
      const uploadDoc = await db.collection("uploads").doc(uploadId).get()

      if (!uploadDoc.exists) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 })
      }

      const uploadData = uploadDoc.data()

      if (uploadData?.userId !== userRecord.uid) {
        return NextResponse.json({ error: "Upload not owned by user" }, { status: 403 })
      }

      // Check if content is already in bundle
      const existingContent = await db
        .collection("bundleContent")
        .where("bundleId", "==", bundleId)
        .where("uploadId", "==", uploadId)
        .get()

      if (!existingContent.empty) {
        return NextResponse.json({ error: "Content already in bundle" }, { status: 400 })
      }

      // Add content to bundle
      const contentData = {
        bundleId,
        uploadId,
        title: uploadData.title || "Untitled",
        description: uploadData.description || "",
        thumbnailUrl: uploadData.thumbnailUrl || "",
        fileUrl: uploadData.fileUrl || "",
        fileType: uploadData.fileType || "",
        fileSize: uploadData.fileSize || 0,
        addedAt: new Date(),
      }

      await db.collection("bundleContent").add(contentData)

      // Update bundle content count
      const newContentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

      await db.collection("bundles").doc(bundleId).update({
        contentCount: newContentSnapshot.size,
        updatedAt: new Date(),
      })

      return NextResponse.json({ success: true, message: "Content added to bundle" })
    }

    if (action === "remove_content" && uploadId) {
      // Find and remove content from bundle
      const contentSnapshot = await db
        .collection("bundleContent")
        .where("bundleId", "==", bundleId)
        .where("uploadId", "==", uploadId)
        .get()

      if (contentSnapshot.empty) {
        return NextResponse.json({ error: "Content not found in bundle" }, { status: 404 })
      }

      const batch = db.batch()
      contentSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()

      // Update bundle content count
      const newContentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

      await db.collection("bundles").doc(bundleId).update({
        contentCount: newContentSnapshot.size,
        updatedAt: new Date(),
      })

      return NextResponse.json({ success: true, message: "Content removed from bundle" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating bundle content:", error)
    return NextResponse.json({ error: "Failed to update bundle content" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id

    // Get bundle document to verify ownership
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    const userRecord = await auth.getUserByEmail(session.user.email)

    if (bundleData?.creatorId !== userRecord.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete all bundle content first
    const contentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

    const batch = db.batch()
    contentSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Delete the bundle itself
    batch.delete(db.collection("bundles").doc(bundleId))

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bundle:", error)
    return NextResponse.json({ error: "Failed to delete bundle" }, { status: 500 })
  }
}
