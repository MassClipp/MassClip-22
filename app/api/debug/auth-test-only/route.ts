import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        authTime: decodedToken.auth_time,
        exp: decodedToken.exp,
        iat: decodedToken.iat,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Auth test error:", error)
    return NextResponse.json(
      {
        error: "Authentication failed",
        details: error.message,
        code: error.code,
      },
      { status: 401 },
    )
  }
}
