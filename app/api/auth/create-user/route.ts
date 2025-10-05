import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db, auth as adminAuth } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    console.log("[v0] Verifying auth token...")
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[v0] No valid Authorization header found")
      return null
    }

    const idToken = authHeader.split("Bearer ")[1]
    console.log("[v0] Token extracted, verifying with Firebase Admin...")

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    console.log("[v0] Token verified successfully for user:", decodedToken.uid)

    return decodedToken
  } catch (error) {
    console.error("[v0] Error verifying auth token:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Create User Profile API called")

    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("[v0] Unauthorized request - no valid token")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    console.log("[v0] User authenticated:", user.uid)

    // Parse request body
    const body = await request.json()
    const { username, displayName } = body
    console.log("[v0] Request body:", { username, displayName, uid: user.uid })

    if (!username) {
      console.error("[v0] Missing username in request")
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Check if user profile already exists
    const userDocRef = db.collection("users").doc(user.uid)
    const userDoc = await userDocRef.get()

    if (userDoc && userDoc.exists) {
      console.log("[v0] User profile already exists, returning isNewUser: false")

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
        isNewUser: false,
      })
    }

    console.log("[v0] Creating new user profile with isNewUser: true")

    const userData = {
      uid: user.uid,
      username: username,
      displayName: displayName || user.name || user.email?.split("@")[0] || username,
      email: user.email,
      isNewUser: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await userDocRef.set(userData)
    console.log("[v0] User profile created successfully")

    return NextResponse.json({
      success: true,
      message: "User profile created",
      uid: user.uid,
      username: username,
      isNewUser: true,
    })
  } catch (error) {
    console.error("[v0] Error in create-user API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
