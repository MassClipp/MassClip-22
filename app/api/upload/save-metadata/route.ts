import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  console.log("Save metadata request received")

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Parse the request body
    const body = await request.json()
    const { title, description, isPremium, fileId, key, fileType, publicUrl, testMode, testUserId } = body

    console.log("Request body:", {
      title,
      hasDescription: !!description,
      isPremium,
      fileId,
      key,
      fileType,
      hasPublicUrl: !!publicUrl,
      testMode,
    })

    // Validate required fields
    if (!title || !fileId || !key || !publicUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let uid

    // Check if we're in test mode
    if (testMode && process.env.PREVIEW_MODE_TRUE === "true") {
      console.log("Using test mode with user:", testUserId)
      uid = testUserId || "test-user"
    } else {
      // Get the session cookie for authentication
      const sessionCookie = request.cookies.get("session")?.value

      if (!sessionCookie) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Verify the session cookie
      try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie)
        uid = decodedClaims.uid
        console.log("Session verified for user:", uid)
      } catch (error) {
        console.error("Session verification failed:", error)
        return NextResponse.json({ error: "Invalid session" }, { status: 401 })
      }
    }

    // Determine the collection based on premium status
    const collectionName = isPremium ? "premiumClips" : "freeClips"

    // Create the metadata document
    const metadata = {
      title,
      description: description || "",
      fileId,
      key,
      fileType,
      publicUrl,
      isPremium: !!isPremium,
      createdAt: new Date().toISOString(),
      views: 0,
      downloads: 0,
    }

    console.log(`Saving metadata to users/${uid}/${collectionName}/${fileId}`)

    // Save the metadata to Firestore
    await db.collection("users").doc(uid).collection(collectionName).doc(fileId).set(metadata)

    console.log("Metadata saved successfully")

    return NextResponse.json({
      success: true,
      message: "Metadata saved successfully",
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
