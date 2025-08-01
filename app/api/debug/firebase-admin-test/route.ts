import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()

    // Extract token from Authorization header (preferred) or body (fallback)
    const authHeader = request.headers.get("authorization")
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : body.idToken

    console.log("🔍 [Firebase Admin Test] Request received:", {
      hasAuthHeader: !!authHeader,
      hasBodyToken: !!body.idToken,
      hasIdToken: !!idToken,
      tokenSource: authHeader ? "header" : body.idToken ? "body" : "none",
    })

    if (!idToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No ID token found in Authorization header or request body",
          received: {
            hasAuthHeader: !!authHeader,
            hasBodyToken: !!body.idToken,
            bodyKeys: Object.keys(body),
          },
        },
        { status: 401 },
      )
    }

    // Test Firebase Admin configuration
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? "Set" : "Missing",
    }

    console.log("🔍 [Firebase Admin Test] Firebase config:", {
      hasProjectId: !!firebaseConfig.projectId,
      hasClientEmail: !!firebaseConfig.clientEmail,
      hasPrivateKey: firebaseConfig.privateKey === "Set",
    })

    // Verify Firebase ID token
    let decodedToken
    try {
      console.log("🔍 [Firebase Admin Test] Verifying token with Firebase Admin...")
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Firebase Admin Test] Token verified successfully")
    } catch (error: any) {
      console.error("❌ [Firebase Admin Test] Token verification failed:", error)
      return NextResponse.json(
        {
          error: "Firebase Admin token verification failed",
          details: error.message,
          code: error.code,
          firebaseConfig,
          tokenInfo: {
            tokenLength: idToken.length,
            tokenFormat: idToken.split(".").length === 3 ? "Valid JWT format" : "Invalid JWT format",
          },
        },
        { status: 401 },
      )
    }

    // Test Firestore connection
    let firestoreTest = null
    try {
      console.log("🔍 [Firebase Admin Test] Testing Firestore connection...")
      const testDoc = await db.collection("users").doc(decodedToken.uid).get()
      firestoreTest = {
        success: true,
        userDocExists: testDoc.exists,
        userData: testDoc.exists
          ? {
              hasStripeCustomerId: !!testDoc.data()?.stripeCustomerId,
              hasEmail: !!testDoc.data()?.email,
              hasUsername: !!testDoc.data()?.username,
            }
          : null,
      }
      console.log("✅ [Firebase Admin Test] Firestore connection successful")
    } catch (firestoreError: any) {
      console.error("❌ [Firebase Admin Test] Firestore connection failed:", firestoreError)
      firestoreTest = {
        success: false,
        error: firestoreError.message,
      }
    }

    return NextResponse.json({
      success: true,
      message: "Firebase Admin test successful",
      firebaseConfig,
      tokenVerification: {
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
        },
        tokenDetails: {
          issuer: decodedToken.iss,
          audience: decodedToken.aud,
          issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
          expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
          authTime: new Date(decodedToken.auth_time * 1000).toISOString(),
        },
      },
      firestoreTest,
    })
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
