import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Firebase Admin Test] Starting Firebase Admin verification test...")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Extract token from Authorization header (preferred) or body (fallback)
    let idToken: string | null = null

    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7)
      console.log("🔍 [Firebase Admin Test] Token extracted from Authorization header")
    } else {
      const body = await request.json()
      idToken = body.idToken
      console.log("🔍 [Firebase Admin Test] Token extracted from request body")
    }

    if (!idToken) {
      console.error("❌ [Firebase Admin Test] No ID token provided")
      return NextResponse.json(
        {
          error: "No ID token provided",
          details: "idToken is required in Authorization header or request body",
        },
        { status: 401 },
      )
    }

    console.log("🔍 [Firebase Admin Test] Verifying token with Firebase Admin...")

    try {
      const decodedToken = await auth.verifyIdToken(idToken)

      console.log("✅ [Firebase Admin Test] Token verified successfully")

      return NextResponse.json({
        success: true,
        message: "Firebase Admin verification successful",
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          authTime: decodedToken.auth_time,
          exp: decodedToken.exp,
          iat: decodedToken.iat,
        },
        firebaseConfig: {
          projectId: process.env.FIREBASE_PROJECT_ID ? "Set" : "Missing",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "Set" : "Missing",
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? "Set" : "Missing",
        },
        timestamp: new Date().toISOString(),
      })
    } catch (tokenError: any) {
      console.error("❌ [Firebase Admin Test] Token verification failed:", tokenError)

      return NextResponse.json(
        {
          error: "Firebase Admin token verification failed",
          details: tokenError.message,
          code: tokenError.code,
          firebaseConfig: {
            projectId: process.env.FIREBASE_PROJECT_ID ? "Set" : "Missing",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "Set" : "Missing",
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? "Set" : "Missing",
          },
        },
        { status: 401 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Firebase Admin Test] Unexpected error:", error)

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
