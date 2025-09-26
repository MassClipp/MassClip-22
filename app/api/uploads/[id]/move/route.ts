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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { folderId } = await request.json()
    const uploadId = params.id

    // Get the upload document
    const uploadRef = db.collection("uploads").doc(uploadId)
    const uploadDoc = await uploadRef.get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()
    if (uploadData?.uid !== user.uid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Validate folder if provided
    if (folderId) {
      const folderRef = db.collection("folders").doc(folderId)
      const folderDoc = await folderRef.get()

      if (!folderDoc.exists) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 })
      }

      const folderData = folderDoc.data()
      if (folderData?.uid !== user.uid) {
        return NextResponse.json({ error: "Folder access denied" }, { status: 403 })
      }
    }

    // Update the upload document
    await uploadRef.update({
      folderId: folderId || null,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "File moved successfully",
    })
  } catch (error) {
    console.error("Error moving file:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
