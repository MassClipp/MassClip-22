import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase/firebaseAdmin"

export async function GET() {
  try {
    console.log("🔍 [Firebase Admin Debug] Checking configuration...")

    // Check environment variables
    const envCheck = {
      FIREBASE_PROJECT_ID: {
        exists: !!process.env.FIREBASE_PROJECT_ID,
        value: process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID.substring(0, 10)}...` : null,
      },
      FIREBASE_CLIENT_EMAIL: {
        exists: !!process.env.FIREBASE_CLIENT_EMAIL,
        value: process.env.FIREBASE_CLIENT_EMAIL ? `${process.env.FIREBASE_CLIENT_EMAIL.substring(0, 20)}...` : null,
      },
      FIREBASE_PRIVATE_KEY: {
        exists: !!process.env.FIREBASE_PRIVATE_KEY,
        length: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        startsWithBegin: process.env.FIREBASE_PRIVATE_KEY?.startsWith("-----BEGIN") || false,
      },
    }

    // Try to initialize Firebase Admin
    const firebaseResult = initializeFirebaseAdmin()

    return NextResponse.json({
      success: true,
      environmentVariables: envCheck,
      firebaseAdmin: {
        initialized: !!firebaseResult.app,
        hasAuth: !!firebaseResult.auth,
        hasDb: !!firebaseResult.db,
        error: firebaseResult.error,
      },
      recommendations: [
        !envCheck.FIREBASE_PROJECT_ID.exists && "Set FIREBASE_PROJECT_ID environment variable",
        !envCheck.FIREBASE_CLIENT_EMAIL.exists && "Set FIREBASE_CLIENT_EMAIL environment variable",
        !envCheck.FIREBASE_PRIVATE_KEY.exists && "Set FIREBASE_PRIVATE_KEY environment variable",
        envCheck.FIREBASE_PRIVATE_KEY.exists &&
          !envCheck.FIREBASE_PRIVATE_KEY.startsWithBegin &&
          "FIREBASE_PRIVATE_KEY should start with -----BEGIN PRIVATE KEY-----",
      ].filter(Boolean),
    })
  } catch (error) {
    console.error("❌ [Firebase Admin Debug] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
