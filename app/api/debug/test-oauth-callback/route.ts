import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

export async function POST(request: Request) {
  try {
    const { userId, idToken } = await request.json()

    if (!userId || !idToken) {
      return NextResponse.json({ error: "userId and idToken required" }, { status: 400 })
    }

    // Verify Firebase ID token
    try {
      const decodedToken = await adminDb.auth().verifyIdToken(idToken)
      if (decodedToken.uid !== userId) {
        return NextResponse.json({ error: "Token verification failed" }, { status: 401 })
      }
    } catch (error: any) {
      return NextResponse.json(
        {
          error: "Firebase token verification failed",
          details: error.message,
        },
        { status: 401 },
      )
    }

    // Test Stripe initialization
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })

    // Test user document update (without actually updating)
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc = await userDocRef.get()

    return NextResponse.json({
      success: true,
      message: "OAuth callback simulation successful",
      tests: {
        firebaseTokenVerification: "passed",
        stripeInitialization: "passed",
        userDocumentAccess: userDoc.exists ? "passed" : "user_doc_not_found",
        firestoreConnection: "passed",
      },
      userId,
      userExists: userDoc.exists,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "OAuth callback test failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
