import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 [Test Auth] Starting authentication test...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Test Auth] Auth header present:", !!authHeader)
    console.log("🔑 [Test Auth] Auth header value:", authHeader?.substring(0, 20) + "...")

    if (!authHeader) {
      console.log("❌ [Test Auth] No authorization header")
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ [Test Auth] Invalid authorization header format")
      return NextResponse.json({ error: "Invalid authorization header format" }, { status: 401 })
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Test Auth] Token extracted, length:", token.length)
    console.log("🎫 [Test Auth] Token preview:", token.substring(0, 50) + "...")

    // Verify Firebase token
    try {
      const decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Test Auth] Token verified successfully")
      console.log("👤 [Test Auth] User ID:", decodedToken.uid)
      console.log("📧 [Test Auth] User email:", decodedToken.email)

      return NextResponse.json({
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
        },
        tokenInfo: {
          issuer: decodedToken.iss,
          audience: decodedToken.aud,
          issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
          expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
        },
      })
    } catch (error: any) {
      console.error("❌ [Test Auth] Token verification failed:", error.message)
      console.error("❌ [Test Auth] Error code:", error.code)
      console.error("❌ [Test Auth] Error details:", error)

      return NextResponse.json(
        {
          error: "Token verification failed",
          details: error.message,
          code: error.code,
        },
        { status: 401 },
      )
    }
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

export async function POST(request: NextRequest) {
  return GET(request)
}
