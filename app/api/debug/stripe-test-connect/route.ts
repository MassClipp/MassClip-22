import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : null

    // Environment info
    const environment = {
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      nodeEnv: process.env.NODE_ENV || "unknown",
      isPreview: process.env.VERCEL_ENV === "preview",
    }

    // Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    const stripe = {
      hasSecretKey: !!stripeSecretKey,
      keyPrefix: stripeSecretKey?.substring(0, 8) + "..." || "none",
      isTestMode: stripeSecretKey?.startsWith("sk_test_") || false,
      isLiveMode: stripeSecretKey?.startsWith("sk_live_") || false,
    }

    // Firebase configuration
    const firebase = {
      hasConfig: !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ),
      projectId: process.env.FIREBASE_PROJECT_ID || "unknown",
    }

    // User information
    const user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "unknown",
      hasProfile: !!userData,
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
