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
      message: "Firebase Admin verification successful",
      tokenVerified: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      },
      tokenDetails: {
        issuer: decodedToken.iss,
        audience: decodedToken.aud,
        authTime: decodedToken.auth_time,
        issuedAt: decodedToken.iat,
        expiresAt: decodedToken.exp,
      },
      firebaseConfig: {
        projectId: process.env.FIREBASE_PROJECT_ID ? "Set" : "Missing",
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      },
    })
  } catch (error: any) {
    console.error("Firebase Admin test error:", error)
    return NextResponse.json(
      {
        error: "Firebase Admin verification failed",
        details: error.message,
        code: error.code,
        errorType: error.name,
      },
      { status: 401 },
    )
  }
}
