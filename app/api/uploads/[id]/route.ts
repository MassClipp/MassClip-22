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

    return NextResponse.json({ success: true })
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
    // For now, we'll allow deletion

    // Delete the upload record
    await uploadRef.delete()

    // TODO: Optionally delete the file from Cloudflare R2
    // This would require additional logic to clean up storage

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting upload:", error)
    return NextResponse.json({ error: "Failed to delete upload" }, { status: 500 })
  }
}
