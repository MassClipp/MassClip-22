import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 [Test Auth] Starting authentication test...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Test Auth] Auth header:", authHeader ? "present" : "missing")

    if (!authHeader) {
      return NextResponse.json(
        {
          error: "No authorization header",
          received: "none",
        },
        { status: 401 },
      )
    }

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Invalid authorization format",
          received: authHeader.substring(0, 20) + "...",
        },
        { status: 401 },
      )
    }

    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Test Auth] Token length:", token.length)

    if (token.length < 100) {
      return NextResponse.json(
        {
          error: "Token too short",
          length: token.length,
        },
        { status: 401 },
      )
    }

    // Verify token
    try {
      const decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Test Auth] Token verified successfully")

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
    } catch (verifyError: any) {
      console.error("❌ [Test Auth] Token verification failed:", verifyError.message)
      return NextResponse.json(
        {
          error: "Token verification failed",
          details: verifyError.message,
          code: verifyError.code,
        },
        { status: 401 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Test Auth] Unexpected error:", error)
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
