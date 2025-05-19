import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  console.log("Save metadata API route called")

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Parse the request body
    const body = await request.json()
    const { title, description, isPremium, fileId, key, publicUrl, fileType } = body

    console.log("Request body:", {
      title,
      hasDescription: !!description,
      isPremium,
      fileId,
      key,
      publicUrl,
      fileType,
    })

    // Validate required fields
    if (!title || !fileId || !key || !publicUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the session cookie for authentication
    const cookies = request.cookies
    const sessionCookie = cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Create the video metadata record in Firestore
    const contentType = isPremium ? "premium" : "free"
    const videoData = {
      title,
      description: description || "",
      key,
      fileId,
      contentType: fileType || "video/mp4",
      duration: 0, // Placeholder
      thumbnailUrl: "", // Placeholder
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      userId: uid,
      status: "active",
      views: 0,
      likes: 0,
      publicUrl,
    }

    // Save to the appropriate collection based on content type
    const collectionPath = `users/${uid}/${contentType}Clips`
    await db.collection(collectionPath).doc(fileId).set(videoData)

    return NextResponse.json({
      success: true,
      fileId,
    })
  } catch (error) {
    console.error("Error saving metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to save metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
