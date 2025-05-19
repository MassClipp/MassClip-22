import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    console.log("Complete upload request received")

    // Get request body
    const { fileId, key, title, description, isPremium } = await request.json()

    // Validate required fields
    if (!fileId || !key || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user info
    let userId = "anonymous"
    let username = "anonymous"

    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin()

      // Get session cookie
      const sessionCookie = cookies().get("session")?.value

      if (sessionCookie) {
        // Verify session
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
        userId = decodedClaims.uid

        // Get user data from auth
        const userRecord = await getAuth().getUser(userId)
        username = userRecord.displayName || userId
      }
    } catch (authError) {
      console.error("Auth error:", authError)
      // Continue with anonymous upload for testing
    }

    // Determine the collection based on premium status
    const contentType = isPremium ? "premium" : "free"
    const collectionPath = `users/${userId}/${contentType}Clips`

    // Create the video metadata
    const videoData = {
      title,
      description: description || "",
      key,
      fileId,
      contentType,
      duration: 0, // Placeholder
      thumbnailUrl: "", // Placeholder
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      userId,
      username,
      status: "active",
      views: 0,
      likes: 0,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
    }

    // Save to Firestore
    console.log(`Saving to collection: ${collectionPath}`)
    await db.collection(collectionPath).doc(fileId).set(videoData)

    // Update user's clip counts
    const countField = contentType === "premium" ? "premiumClipCount" : "freeClipCount"
    await db
      .collection("users")
      .doc(userId)
      .update({
        [countField]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    console.log("Upload completed successfully")

    return NextResponse.json({
      success: true,
      message: "Upload completed successfully",
      videoId: fileId,
      publicUrl: videoData.publicUrl,
    })
  } catch (error) {
    console.error("Error completing upload:", error)
    return NextResponse.json(
      { error: "Failed to complete upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
