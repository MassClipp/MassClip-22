import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const auth = getAuth()
const db = getFirestore()

export async function POST(request: NextRequest) {
  try {
    const { idToken, uid } = await request.json()

    console.log("🔍 [User Profile Lookup] Looking up user profile:", uid)

    // Verify token first
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [User Profile Lookup] Token verified")
    } catch (error: any) {
      console.error("❌ [User Profile Lookup] Token verification failed:", error.message)
      return NextResponse.json(
        {
          error: "Token verification failed",
          details: error.message,
        },
        { status: 401 },
      )
    }

    // Verify UID matches token
    if (decodedToken.uid !== uid) {
      console.error("❌ [User Profile Lookup] UID mismatch:", {
        tokenUid: decodedToken.uid,
        providedUid: uid,
      })
      return NextResponse.json(
        {
          error: "UID mismatch",
          details: "Provided UID does not match token",
        },
        { status: 403 },
      )
    }

    // Look up user profile
    try {
      const userDoc = await db.collection("users").doc(uid).get()

      if (!userDoc.exists) {
        console.warn("⚠️ [User Profile Lookup] User profile not found:", uid)
        return NextResponse.json({
          success: true,
          profileExists: false,
          uid,
          tokenData: {
            uid: decodedToken.uid,
            email: decodedToken.email,
          },
          message: "User profile not found in database",
        })
      }

      const userData = userDoc.data()
      console.log("✅ [User Profile Lookup] User profile found")

      return NextResponse.json({
        success: true,
        profileExists: true,
        uid,
        profile: {
          email: userData.email,
          displayName: userData.displayName,
          username: userData.username,
          createdAt: userData.createdAt,
          stripeAccountId: userData.stripeAccountId ? "Present" : "Not set",
        },
        tokenData: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      })
    } catch (error: any) {
      console.error("❌ [User Profile Lookup] Database error:", error.message)
      return NextResponse.json(
        {
          error: "Database error",
          details: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [User Profile Lookup] Unexpected error:", error.message)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
