import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 [Test Auth] Starting authentication test...")

    // Log all headers for debugging
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 [Test Auth] Request headers:", {
      authorization: headers.authorization ? "present" : "missing",
      contentType: headers["content-type"],
      userAgent: headers["user-agent"]?.substring(0, 50) + "...",
    })

    // Check authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      console.log("❌ [Test Auth] No authorization header")
      return NextResponse.json(
        {
          error: "No authorization header",
          headers: Object.keys(headers),
        },
        { status: 401 },
      )
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ [Test Auth] Invalid authorization format:", authHeader.substring(0, 20))
      return NextResponse.json(
        {
          error: "Invalid authorization format",
          received: authHeader.substring(0, 20),
        },
        { status: 401 },
      )
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Test Auth] Token extracted:", {
      length: token.length,
      starts: token.substring(0, 20),
      ends: token.substring(token.length - 20),
    })

    // Verify token
    try {
      const decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Test Auth] Token verified successfully:", {
        uid: decodedToken.uid,
        email: decodedToken.email,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
      })

      return NextResponse.json({
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
        },
        tokenInfo: {
          iss: decodedToken.iss,
          aud: decodedToken.aud,
          authTime: decodedToken.auth_time,
          exp: decodedToken.exp,
        },
      })
    } catch (verifyError: any) {
      console.error("❌ [Test Auth] Token verification failed:", {
        error: verifyError.message,
        code: verifyError.code,
        stack: verifyError.stack?.split("\n")[0],
      })

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
