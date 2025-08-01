import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin()

    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization")
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!idToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No Bearer token found in Authorization header",
        },
        { status: 401 },
      )
    }

    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)

    return NextResponse.json({
      success: true,
      message: "Authentication test successful",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      },
      tokenInfo: {
        authTime: decodedToken.auth_time,
        exp: decodedToken.exp,
        iat: decodedToken.iat,
      },
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
