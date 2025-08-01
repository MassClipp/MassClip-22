import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
    console.log("✅ Firebase Admin initialized")
  } catch (error: any) {
    console.error("❌ Firebase Admin initialization failed:", error.message)
  }
}

const auth = getAuth()
const db = getFirestore()

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    console.log("🔍 [Firebase Admin Test] Testing Firebase Admin connection")

    // Test 1: Verify token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Firebase Admin Test] Token verification successful")
    } catch (error: any) {
      console.error("❌ [Firebase Admin Test] Token verification failed:", error.message)
      return NextResponse.json(
        {
          error: "Token verification failed",
          details: error.message,
          step: "token_verification",
        },
        { status: 401 },
      )
    }

    // Test 2: Test Firestore connection
    try {
      const testDoc = await db.collection("_test").doc("connection").get()
      console.log("✅ [Firebase Admin Test] Firestore connection successful")
    } catch (error: any) {
      console.error("❌ [Firebase Admin Test] Firestore connection failed:", error.message)
      return NextResponse.json(
        {
          error: "Firestore connection failed",
          details: error.message,
          step: "firestore_connection",
        },
        { status: 500 },
      )
    }

    // Test 3: Check environment variables
    const envCheck = {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID,
    }

    return NextResponse.json({
      success: true,
      tokenValid: true,
      firestoreConnected: true,
      decodedToken: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
      },
      environment: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ [Firebase Admin Test] Unexpected error:", error.message)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error.message,
        step: "unexpected",
      },
      { status: 500 },
    )
  }
}
