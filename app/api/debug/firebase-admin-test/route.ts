import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Firebase Admin Test] Starting Firebase Admin verification...")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken } = body

    console.log("🔍 [Firebase Admin Test] Request details:", {
      hasIdToken: !!idToken,
      tokenLength: idToken?.length,
      contentType: request.headers.get("content-type"),
      authorization: request.headers.get("authorization") ? "Present" : "Missing",
    })

    if (!idToken) {
      console.error("❌ [Firebase Admin Test] No ID token provided")
      return NextResponse.json(
        {
          error: "No ID token provided",
          details: "idToken is required for Firebase Admin verification",
        },
        { status: 400 },
      )
    }

    // Test Firebase Admin initialization
    console.log("🔍 [Firebase Admin Test] Testing Firebase Admin initialization...")

    try {
      // Verify the token using Firebase Admin
      console.log("🔍 [Firebase Admin Test] Verifying token with Firebase Admin...")

      const decodedToken = await auth.verifyIdToken(idToken)

      console.log("✅ [Firebase Admin Test] Token verification successful:", {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      })

      // Additional Firebase Admin tests
      console.log("🔍 [Firebase Admin Test] Testing user lookup...")

      try {
        const userRecord = await auth.getUser(decodedToken.uid)

        console.log("✅ [Firebase Admin Test] User lookup successful")

        return NextResponse.json({
          success: true,
          message: "Firebase Admin verification successful",
          tokenVerification: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            authTime: decodedToken.auth_time,
            exp: decodedToken.exp,
            iat: decodedToken.iat,
            issuer: decodedToken.iss,
            audience: decodedToken.aud,
          },
          userRecord: {
            uid: userRecord.uid,
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
            disabled: userRecord.disabled,
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
            providerData: userRecord.providerData.map((provider) => ({
              providerId: provider.providerId,
              uid: provider.uid,
              email: provider.email,
            })),
          },
        })
      } catch (userLookupError: any) {
        console.error("❌ [Firebase Admin Test] User lookup failed:", userLookupError)

        // Still return success for token verification, but note user lookup issue
        return NextResponse.json({
          success: true,
          message: "Token verification successful, but user lookup failed",
          tokenVerification: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
          },
          userLookupError: {
            message: userLookupError.message,
            code: userLookupError.code,
          },
        })
      }
    } catch (tokenError: any) {
      console.error("❌ [Firebase Admin Test] Token verification failed:", tokenError)

      return NextResponse.json(
        {
          error: "Firebase Admin token verification failed",
          details: tokenError.message,
          code: tokenError.code,
          tokenAnalysis: {
            tokenLength: idToken.length,
            tokenParts: idToken.split(".").length,
            isValidJWTFormat: idToken.split(".").length === 3,
            tokenPrefix: idToken.substring(0, 20) + "...",
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
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
