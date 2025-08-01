import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Auth Test] Starting auth-only test...")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Extract token from Authorization header (preferred) or body (fallback)
    let idToken: string | null = null

    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7)
      console.log("🔍 [Auth Test] Token extracted from Authorization header")
    } else {
      const body = await request.json()
      idToken = body.idToken
      console.log("🔍 [Auth Test] Token extracted from request body")
    }

    console.log("🔍 [Auth Test] Token extraction result:", {
      hasToken: !!idToken,
      tokenLength: idToken?.length,
      tokenSource: authHeader ? "header" : "body",
    })

    if (!idToken) {
      console.error("❌ [Auth Test] No ID token provided")
      return NextResponse.json(
        {
          error: "No ID token provided",
          details: "idToken is required in Authorization header or request body",
        },
        { status: 401 },
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
