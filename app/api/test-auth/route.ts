import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Auth] Starting authentication test...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Test Auth] Auth header present:", !!authHeader)
    console.log("🔑 [Test Auth] Auth header format:", authHeader?.substring(0, 20) + "...")

    if (!authHeader) {
      console.log("❌ [Test Auth] No authorization header")
      return NextResponse.json(
        {
          error: "No authorization header",
          details: "The Authorization header is missing from the request",
        },
        { status: 401 },
      )
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ [Test Auth] Invalid authorization header format")
      return NextResponse.json(
        {
          error: "Invalid authorization header format",
          details: "Authorization header must start with 'Bearer '",
        },
        { status: 401 },
      )
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Test Auth] Token extracted, length:", token.length)

    if (!token) {
      console.log("❌ [Test Auth] Empty token")
      return NextResponse.json(
        {
          error: "Empty token",
          details: "Token is empty after extracting from Authorization header",
        },
        { status: 401 },
      )
    }

    // Check token format (JWT should have 3 parts)
    const tokenParts = token.split(".")
    if (tokenParts.length !== 3) {
      console.log("❌ [Test Auth] Invalid token format, parts:", tokenParts.length)
      return NextResponse.json(
        {
          error: "Invalid token format",
          details: `JWT should have 3 parts separated by dots, found ${tokenParts.length}`,
        },
        { status: 401 },
      )
    }

    // Verify Firebase token
    let decodedToken
    try {
      console.log("🔍 [Test Auth] Verifying token with Firebase Admin...")
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Test Auth] Token verified successfully for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Test Auth] Token verification failed:", error.message)
      console.error("❌ [Test Auth] Error code:", error.code)
      console.error("❌ [Test Auth] Error details:", error)

      return NextResponse.json(
        {
          error: "Token verification failed",
          details: {
            message: error.message,
            code: error.code,
            type: error.constructor.name,
          },
        },
        { status: 401 },
      )
    }

    // Success response with token details
    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        authTime: decodedToken.auth_time,
        issuer: decodedToken.iss,
        audience: decodedToken.aud,
      },
      token: {
        length: token.length,
        parts: tokenParts.length,
        algorithm: "Firebase ID Token",
        issuedAt: decodedToken.iat,
        expiresAt: decodedToken.exp,
      },
    })
  } catch (error: any) {
    console.error("❌ [Test Auth] Unexpected error:", error.message)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
