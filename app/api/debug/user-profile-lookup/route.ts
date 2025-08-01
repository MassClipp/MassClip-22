import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [User Profile Lookup] Starting lookup...")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let userId: string

    // Verify authentication
    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log("✅ [User Profile Lookup] Token verified for user:", userId)
    } catch (error: any) {
      console.error("❌ [User Profile Lookup] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { userId: requestedUserId } = body

    // Verify user is requesting their own profile
    if (requestedUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized profile access" }, { status: 403 })
    }

    // Look up user profile
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log("⚠️ [User Profile Lookup] User profile not found:", userId)
      return NextResponse.json({
        success: false,
        profileExists: false,
        userId: userId,
        message: "User profile not found in database",
      })
    }

    const userData = userDoc.data()!
    console.log("✅ [User Profile Lookup] User profile found:", userId)

    return NextResponse.json({
      success: true,
      profileExists: true,
      userId: userId,
      profile: {
        email: userData.email,
        displayName: userData.displayName,
        name: userData.name,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
      },
    })
  } catch (error: any) {
    console.error("❌ [User Profile Lookup] Lookup failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
