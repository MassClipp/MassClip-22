import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("Complete upload request received")

    // Get request body
    const body = await request.json()
    const { fileId, key, title, description, isPremium } = body
    const testMode = body.testMode === true

    // Validate required fields
    if (!fileId || !key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user info
    let userId = "test-user"
    let username = "test-user"
    let isAuthenticated = false

    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin()

      // Get session cookie
      const sessionCookie = cookies().get("session")?.value

      if (sessionCookie) {
        // Verify session
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie)
        userId = decodedClaims.uid
        isAuthenticated = true

        // Get user data from auth
        const userRecord = await getAuth().getUser(userId)
        username = userRecord.displayName || userId

        console.log("User authenticated:", { userId, username })
      } else {
        console.log("No session cookie found")
      }
    } catch (authError) {
      console.error("Auth error:", authError)
      // Continue with test user for testing
    }

    // If not authenticated and not in test mode, return error
    if (!isAuthenticated && !testMode && process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
      console.log("Authentication required and not in test mode")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Prepare video data
    const contentCategory = isPremium ? "premium" : "free"
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
    const timestamp = new Date().toISOString()

    const videoData = {
      fileId,
      key,
      title: title || "Untitled Video",
      description: description || "",
      contentType: contentCategory,
      url: publicUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
      views: 0,
      likes: 0,
      isPremium: Boolean(isPremium),
    }

    // Save to Firestore if authenticated
    if (isAuthenticated) {
      const db = getFirestore()
      const collectionName = isPremium ? "premiumClips" : "freeClips"

      await db.collection("users").doc(userId).collection(collectionName).doc(fileId).set(videoData)

      console.log(`Saved video metadata to ${collectionName}:`, { fileId })
    } else {
      console.log("Test mode: Skipping Firestore save")
    }

    return NextResponse.json({
      success: true,
      fileId,
      url: publicUrl,
      isAuthenticated,
      testMode,
    })
  } catch (error) {
    console.error("Error completing upload:", error)
    return NextResponse.json(
      { error: "Failed to complete upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
