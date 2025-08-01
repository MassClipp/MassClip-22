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
  } catch (error: any) {
    console.error("❌ Firebase Admin initialization failed:", error.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuth()
    const db = getFirestore()

    // Test Firebase Admin configuration
    const configTest = {
      projectId: process.env.FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "✅ Set" : "❌ Missing",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? "✅ Set" : "❌ Missing",
    }

    // Test token verification if provided
    let tokenTest = null
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        tokenTest = {
          status: "✅ Valid",
          uid: decodedToken.uid,
          email: decodedToken.email,
        }
      } catch (error: any) {
        tokenTest = {
          status: "❌ Invalid",
          error: error.message,
        }
      }
    }

    // Test Firestore connection
    let firestoreTest
    try {
      await db.collection("test").limit(1).get()
      firestoreTest = "✅ Connected"
    } catch (error: any) {
      firestoreTest = `❌ Error: ${error.message}`
    }

    return NextResponse.json({
      success: true,
      config: configTest,
      tokenVerification: tokenTest,
      firestore: firestoreTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Firebase Admin test error:", error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
