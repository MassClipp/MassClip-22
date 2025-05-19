import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    console.log("Register upload request received")

    // Get request body
    const body = await request.json()
    const { fileId, storagePath, publicUrl, title, description, isPremium, duration, thumbnailUrl } = body

    // Validate required fields
    if (!fileId || !storagePath || !publicUrl || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Get user info from session cookie
    let userId = null
    let username = null

    try {
      // Get session cookie
      const sessionCookie = cookies().get("session")?.value

      if (!sessionCookie) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Verify session
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
      userId = decodedClaims.uid

      // Get user data from Firestore
      const userDoc = await db.collection("users").doc(userId).get()

      if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const userData = userDoc.data()
      username = userData.username || userId

      console.log("User authenticated:", { userId, username })
    } catch (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Determine the collection based on premium status
    const contentType = isPremium ? "premium" : "free"
    const collectionPath = `users/${userId}/${contentType}Clips`

    // Create the video metadata
    const timestamp = new Date().toISOString()

    const videoData = {
      id: fileId,
      title,
      description: description || "",
      storagePath,
      contentType,
      url: publicUrl,
      thumbnailUrl: thumbnailUrl || "",
      duration: duration || 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      userId,
      username,
      status: "active",
      views: 0,
      likes: 0,
      isPremium: Boolean(isPremium),
    }

    // Save to Firestore
    console.log(`Saving to collection: ${collectionPath}, document: ${fileId}`)
    console.log("Video data:", videoData)

    await db.collection(collectionPath).doc(fileId).set(videoData)

    // Update user's clip counts
    const userRef = db.collection("users").doc(userId)
    const countField = isPremium ? "premiumClipCount" : "freeClipCount"

    await userRef.update({
      [countField]: FieldValue.increment(1),
      updatedAt: timestamp,
    })

    // Add a log entry
    await db.collection("logs").add({
      type: "upload_registered",
      userId,
      username,
      fileId,
      contentType,
      timestamp,
      success: true,
      data: videoData,
    })

    console.log("Upload registration completed successfully")

    return NextResponse.json({
      success: true,
      message: "Upload registration completed successfully",
      videoId: fileId,
      publicUrl,
      videoData,
    })
  } catch (error) {
    console.error("Error registering upload:", error)

    // Log the error to Firestore
    try {
      const db = getFirestore()
      await db.collection("logs").add({
        type: "upload_registration_error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      })
    } catch (logError) {
      console.error("Failed to log error to Firestore:", logError)
    }

    return NextResponse.json(
      { error: "Failed to register upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
