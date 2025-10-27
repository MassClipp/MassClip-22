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
      console.log("❌ [Auth] No Bearer token found")
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      console.log("❌ [Auth] Empty token")
      return null
    }

    // Import auth here to avoid initialization issues
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    console.log("✅ [Auth] Token verified for user:", decodedToken.uid)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Create User Profile] POST request received")

    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [Create User Profile] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    // Parse request body
    const { username, displayName } = await request.json()
    console.log("🔍 [Create User Profile] Request data:", { username, displayName })

    if (!username) {
      console.error("❌ [Create User Profile] Missing required fields")
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Check if user profile already exists
    const userDocRef = db.collection("users").doc(user.uid)
    const userDoc = await userDocRef.get()

    if (userDoc && userDoc.exists) {
      console.log("✅ [Create User Profile] User profile already exists")

      // Update existing profile
      await userDocRef.update({
        username: username,
        displayName: displayName || user.name || user.email?.split("@")[0] || username,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: "User profile updated",
        uid: user.uid,
        username: username,
      })
    }

    // Create new user profile
    const userData = {
      uid: user.uid,
      username: username,
      displayName: displayName || user.name || user.email?.split("@")[0] || username,
      email: user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await userDocRef.set(userData)
    console.log("✅ [Create User Profile] User profile created")

    return NextResponse.json({
      success: true,
      message: "User profile created",
      uid: user.uid,
      username: username,
    })
  } catch (error) {
    console.error("❌ [Create User Profile] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
