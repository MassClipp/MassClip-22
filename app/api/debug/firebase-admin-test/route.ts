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

    console.log("🔍 [Firebase Admin Test] Verifying token...")

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)

    console.log("✅ [Firebase Admin Test] Token verified successfully")

    return NextResponse.json({
      success: true,
      message: "Firebase Admin verification successful",
      decodedToken: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        authTime: decodedToken.auth_time,
        exp: decodedToken.exp,
        iat: decodedToken.iat,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
        firebase: decodedToken.firebase,
      },
      serverTime: new Date().toISOString(),
      tokenExpiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      tokenIsValid: decodedToken.exp * 1000 > Date.now(),
    })
  } catch (error: any) {
    console.error("❌ [Firebase Admin Test] Token verification failed:", error)
    return NextResponse.json(
      {
        error: "Firebase Admin verification failed",
        details: error.message,
        code: error.code,
        errorInfo: {
          name: error.name,
          message: error.message,
          code: error.code,
        },
      },
      { status: 401 },
    )
  }
}
