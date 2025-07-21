import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Auth] Starting authentication test...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Test Auth] Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Test Auth] Invalid or missing Bearer token")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          details: "No valid Bearer token found in Authorization header",
        },
        { status: 401 },
      )
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Test Auth] Token extracted, length:", token.length)

    // Verify Firebase token
    try {
      console.log("🔍 [Test Auth] Verifying token...")
      const decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Test Auth] Token verified for user:", decodedToken.uid)

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
          parts: token.split(".").length,
          algorithm: "Firebase ID Token",
          issuedAt: decodedToken.iat,
          expiresAt: decodedToken.exp,
        },
      })
    } catch (error: any) {
      console.error("❌ [Test Auth] Token verification failed:", error.message)
      console.error("❌ [Test Auth] Error code:", error.code)

      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication token",
          details: {
            message: error.message,
            code: error.code,
            tokenLength: token.length,
          },
        },
        { status: 401 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Test Auth] Unexpected error:", error.message)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
