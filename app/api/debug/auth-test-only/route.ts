import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Auth Test] Starting auth-only test...")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken } = body

    console.log("🔍 [Auth Test] Request received:", {
      hasIdToken: !!idToken,
      tokenLength: idToken?.length,
      bodyKeys: Object.keys(body),
    })

    // Check authorization header as well
    const authHeader = request.headers.get("authorization")
    console.log("🔍 [Auth Test] Authorization header:", {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader?.startsWith("Bearer ") ? "Valid Bearer format" : "Invalid format",
    })

    if (!idToken) {
      console.error("❌ [Auth Test] No ID token provided")
      return NextResponse.json(
        {
          error: "No ID token provided",
          details: "idToken is required in request body",
        },
        { status: 400 },
      )
    }

    // Verify the token
    console.log("🔍 [Auth Test] Verifying Firebase ID token...")

    try {
      const decodedToken = await auth.verifyIdToken(idToken)

      console.log("✅ [Auth Test] Token verified successfully:", {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      })

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
        tokenInfo: {
          issuer: decodedToken.iss,
          audience: decodedToken.aud,
          subject: decodedToken.sub,
        },
      })
    } catch (tokenError: any) {
      console.error("❌ [Auth Test] Token verification failed:", tokenError)

      return NextResponse.json(
        {
          error: "Token verification failed",
          details: tokenError.message,
          code: tokenError.code,
          tokenAnalysis: {
            tokenLength: idToken.length,
            tokenParts: idToken.split(".").length,
            isValidJWTFormat: idToken.split(".").length === 3,
          },
        },
        { status: 401 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Auth Test] Unexpected error:", error)

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
