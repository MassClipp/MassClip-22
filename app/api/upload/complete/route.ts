import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    console.log("Upload complete request received")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const { fileId, contentType } = await request.json()

    // Validate request
    if (!fileId || !contentType) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Unauthorized - missing or invalid auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      // Verify Firebase token
      const token = authHeader.split("Bearer ")[1]
      const decodedToken = await getAuth().verifyIdToken(token)
      const uid = decodedToken.uid
      console.log("User authenticated:", uid)

      // Update the video status to active
      const collectionPath = `users/${uid}/${contentType}Clips`
      await db.collection(collectionPath).doc(fileId).update({
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Update user's clip counts
      const countField = contentType === "premium" ? "premiumClipCount" : "freeClipCount"
      await db
        .collection("users")
        .doc(uid)
        .update({
          [countField]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        })

      console.log("Upload marked as complete")
      return NextResponse.json({
        success: true,
        message: "Upload marked as complete",
      })
    } catch (authError) {
      console.error("Authentication error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error marking upload as complete:", error)
    return NextResponse.json(
      {
        error: "Failed to mark upload as complete",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
