import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  console.log("🔍 [Firebase Admin Test] Starting comprehensive test")

  try {
    // Initialize Firebase Admin
    console.log("🔍 [Firebase Admin Test] Initializing Firebase Admin")
    initializeFirebaseAdmin()
    console.log("✅ [Firebase Admin Test] Firebase Admin initialized")

    // Get request data
    const body = await request.json()
    const { idToken, testMode, includeHeaders } = body

    console.log("🔍 [Firebase Admin Test] Request data:", {
      hasIdToken: !!idToken,
      idTokenLength: idToken?.length,
      testMode,
      includeHeaders,
    })

    // Check authorization header as well
    const authHeader = request.headers.get("authorization")
    console.log("🔍 [Firebase Admin Test] Authorization header:", {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader?.startsWith("Bearer ") ? "Bearer format" : "Invalid format",
      authHeaderLength: authHeader?.length,
    })

    if (!idToken) {
      console.error("❌ [Firebase Admin Test] No ID token provided")
      return NextResponse.json(
        {
          error: "No ID token provided",
          details: "idToken is required in request body",
        },
        { status: 400 },
      )
    }

    // Validate token format
    const tokenParts = idToken.split(".")
    if (tokenParts.length !== 3) {
      console.error("❌ [Firebase Admin Test] Invalid token format")
      return NextResponse.json(
        {
          error: "Invalid token format",
          details: `Token should have 3 parts separated by dots, got ${tokenParts.length}`,
        },
        { status: 400 },
      )
    }

    console.log("🔍 [Firebase Admin Test] Token format validation passed")

    // Verify the ID token
    console.log("🔍 [Firebase Admin Test] Verifying ID token with Firebase Admin")

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Firebase Admin Test] Token verified successfully")
      console.log("🔍 [Firebase Admin Test] Decoded token:", {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        authTime: decodedToken.auth_time,
        iat: decodedToken.iat,
        exp: decodedToken.exp,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
      })
    } catch (verifyError: any) {
      console.error("❌ [Firebase Admin Test] Token verification failed:", verifyError)
      return NextResponse.json(
        {
          error: "Token verification failed",
          details: verifyError.message,
          code: verifyError.code,
          stack: verifyError.stack,
        },
        { status: 401 },
      )
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = decodedToken.exp - now

    console.log("🔍 [Firebase Admin Test] Token expiration check:", {
      currentTime: now,
      tokenExp: decodedToken.exp,
      timeUntilExpiry,
      isExpired: timeUntilExpiry <= 0,
    })

    if (timeUntilExpiry <= 0) {
      console.error("❌ [Firebase Admin Test] Token is expired")
      return NextResponse.json(
        {
          error: "Token expired",
          details: `Token expired ${Math.abs(timeUntilExpiry)} seconds ago`,
        },
        { status: 401 },
      )
    }

    // Prepare response
    const response = {
      success: true,
      message: "Firebase Admin verification successful",
      tokenInfo: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        authTime: decodedToken.auth_time,
        issuedAt: decodedToken.iat,
        expiresAt: decodedToken.exp,
        timeUntilExpiry,
        issuer: decodedToken.iss,
        audience: decodedToken.aud,
        firebase: decodedToken.firebase,
      },
      serverInfo: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
        hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      },
    }

    if (includeHeaders) {
      response.serverInfo = {
        ...response.serverInfo,
        requestHeaders: Object.fromEntries(request.headers.entries()),
      }
    }

    console.log("✅ [Firebase Admin Test] Test completed successfully")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Firebase Admin Test] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
        serverInfo: {
          timestamp: new Date().toISOString(),
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 },
    )
  }
}
