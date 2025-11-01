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

export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { uploadIds, folderId } = await request.json()

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({ error: "Invalid upload IDs" }, { status: 400 })
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

    // Use batch to update multiple documents
    const batch = db.batch()
    const results = []

    for (const uploadId of uploadIds) {
      const uploadRef = db.collection("uploads").doc(uploadId)
      const uploadDoc = await uploadRef.get()

      if (!uploadDoc.exists) {
        results.push({ id: uploadId, success: false, error: "Upload not found" })
        continue
      }

      const uploadData = uploadDoc.data()
      if (uploadData?.uid !== user.uid) {
        results.push({ id: uploadId, success: false, error: "Access denied" })
        continue
      }

      batch.update(uploadRef, {
        folderId: folderId || null,
        updatedAt: new Date(),
      })

      results.push({ id: uploadId, success: true })
    }

    // Commit the batch
    await batch.commit()

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount} files moved successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
      results,
    })
  } catch (error) {
    console.error("Error bulk moving files:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
