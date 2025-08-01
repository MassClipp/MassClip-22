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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const auth = getAuth()
    const db = getFirestore()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Verify token if provided
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        if (decodedToken.uid !== userId) {
          return NextResponse.json({ error: "Token UID mismatch" }, { status: 403 })
        }
      } catch (error: any) {
        return NextResponse.json({ error: "Invalid token", details: error.message }, { status: 401 })
      }
    }

    // Look up user profile
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        found: false,
        message: "User profile not found",
        userId,
      })
    }

    const userData = userDoc.data()

    return NextResponse.json({
      success: true,
      found: true,
      message: "User profile found",
      userId,
      profile: {
        email: userData?.email,
        displayName: userData?.displayName,
        username: userData?.username,
        createdAt: userData?.createdAt,
      },
    })
  } catch (error: any) {
    console.error("❌ User profile lookup error:", error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
