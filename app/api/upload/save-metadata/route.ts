import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const { title, description, key, fileId, contentType, duration, thumbnailUrl } = await request.json()

    // Validate request
    if (!title || !key || !fileId || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Firebase token
    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const uid = decodedToken.uid

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
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

    return NextResponse.json({
      success: true,
      videoId: fileId,
      message: "Video metadata saved successfully",
    })
  } catch (error) {
    console.error("Error saving video metadata:", error)
    return NextResponse.json({ error: "Failed to save video metadata" }, { status: 500 })
  }
}
