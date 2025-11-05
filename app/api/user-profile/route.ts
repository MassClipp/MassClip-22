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

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [User Profile API] GET request received")

    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [User Profile API] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    // Get UID from query params or use authenticated user's UID
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get("uid") || user.uid

    console.log(`🔍 [User Profile API] Fetching profile for UID: ${uid}`)

    // Get user profile from Firestore
    const userDocRef = db.collection("users").doc(uid)
    const userDoc = await userDocRef.get()

    if (!userDoc || !userDoc.exists) {
      console.log(`❌ [User Profile API] User profile not found for UID: ${uid}`)
      return NextResponse.json(
        {
          error: "Not Found",
          details: "User profile not found",
        },
        { status: 404 },
      )
    }

    const userData = userDoc.data() || {}
    console.log(`✅ [User Profile API] User profile found:`, userData)

    // Return user profile data
    return NextResponse.json({
      uid: uid,
      username: userData.username,
      displayName: userData.displayName,
      email: userData.email,
      createdAt: userData.createdAt,
    })
  } catch (error) {
    console.error("❌ [User Profile API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
