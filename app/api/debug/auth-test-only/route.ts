import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization")
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    console.log("🔍 [Auth Test] Request received:", {
      hasAuthHeader: !!authHeader,
      hasIdToken: !!idToken,
      idTokenLength: idToken?.length,
    })

    if (!idToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No valid Bearer token found in Authorization header",
          received: {
            hasAuthHeader: !!authHeader,
            authHeaderFormat: authHeader?.substring(0, 20) + "...",
          },
        },
        { status: 401 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      console.log("🔍 [Auth Test] Verifying Firebase token...")
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Auth Test] Token verified successfully")
    } catch (error: any) {
      console.error("❌ [Auth Test] Token verification failed:", error)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error.message,
          code: error.code,
          tokenInfo: {
            tokenLength: idToken.length,
            tokenFormat: idToken.split(".").length === 3 ? "Valid JWT format" : "Invalid JWT format",
            tokenStart: idToken.substring(0, 20) + "...",
          },
        },
        { status: 401 },
      )
    }

    // Return success with user info
    return NextResponse.json({
      success: true,
      message: "Authentication test successful",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        authTime: decodedToken.auth_time,
        tokenIssuer: decodedToken.iss,
        tokenAudience: decodedToken.aud,
      },
      tokenInfo: {
        issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
        expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
        authTime: new Date(decodedToken.auth_time * 1000).toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Auth Test] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
