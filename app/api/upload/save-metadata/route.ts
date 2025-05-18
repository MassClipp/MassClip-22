import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    console.log("Save metadata request received")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const { title, description, key, fileId, contentType, duration, thumbnailUrl } = await request.json()
    console.log("Metadata request body:", { title, key, fileId, contentType })

    // Validate request
    if (!title || !key || !fileId || !contentType) {
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

      // Get user data from Firestore
      const userDoc = await db.collection("users").doc(uid).get()
      if (!userDoc.exists) {
        console.log("User not found in Firestore")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Create the video metadata
      const videoData = {
        title,
        description: description || "",
        key,
        fileId,
        contentType, // "free" or "premium"
        duration: duration || 0,
        thumbnailUrl: thumbnailUrl || "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        userId: uid,
        status: "active",
        views: 0,
        likes: 0,
        publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
      }

      // Save to the appropriate collection based on content type
      const collectionPath = `users/${uid}/${contentType}Clips`
      console.log(`Saving to collection: ${collectionPath}`)
      await db.collection(collectionPath).doc(fileId).set(videoData)

      // Update user's clip counts
      const countField = contentType === "premium" ? "premiumClipCount" : "freeClipCount"
      await db
        .collection("users")
        .doc(uid)
        .update({
          [countField]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        })

      console.log("Metadata saved successfully")
      return NextResponse.json({
        success: true,
        videoId: fileId,
        message: "Video metadata saved successfully",
      })
    } catch (authError) {
      console.error("Authentication error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error saving video metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to save video metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
