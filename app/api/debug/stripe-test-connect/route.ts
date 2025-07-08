import { type NextRequest, NextResponse } from "next/server"
import { auth } from "firebase-admin"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()

export async function GET(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Preview only" }, { status: 403 })
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth().verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get user profile
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    // Environment info
    const environment = {
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      nodeEnv: process.env.NODE_ENV || "unknown",
      isPreview: process.env.VERCEL_ENV === "preview",
    }

    // Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
    const stripe = {
      hasSecretKey: !!stripeSecretKey,
      keyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 8) + "..." : "none",
      isTestMode: stripeSecretKey.startsWith("sk_test_"),
      isLiveMode: stripeSecretKey.startsWith("sk_live_"),
    }

    // Firebase info
    const firebase = {
      hasConfig: !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ),
      projectId: process.env.FIREBASE_PROJECT_ID || "unknown",
    }

    // User info
    const user = {
      uid: userId,
      email: decodedToken.email || "unknown",
      hasProfile: userDoc.exists,
      stripeAccountId: userData?.stripeAccountId || null,
      stripeTestAccountId: userData?.stripeTestAccountId || null,
    }

    return NextResponse.json({
      environment,
      stripe,
      firebase,
      user,
    })
  } catch (error) {
    console.error("Debug info error:", error)
    return NextResponse.json(
      {
        error: "Failed to get debug info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
