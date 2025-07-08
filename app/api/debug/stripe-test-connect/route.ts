import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")
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

    // Stripe configuration info
    const stripe = {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY || !!process.env.STRIPE_SECRET_KEY_TEST,
      hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
      hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: (process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY)?.substring(0, 7) || "none",
      isTestMode: STRIPE_CONFIG.isTestMode,
      isLiveMode: STRIPE_CONFIG.isLiveMode,
      intendedTestMode: STRIPE_CONFIG.intendedTestMode,
      keyMismatch: STRIPE_CONFIG.keyMismatch,
    }

    // Firebase info
    const firebase = {
      hasConfig: !!process.env.FIREBASE_PROJECT_ID,
      projectId: process.env.FIREBASE_PROJECT_ID || "unknown",
    }

    // User info
    const user = {
      uid: uid,
      email: decodedToken.email || "unknown",
      hasProfile: !!userData,
      stripeAccountId: userData?.stripeAccountId || null,
      stripeTestAccountId: userData?.stripeTestAccountId || null,
    }

    return NextResponse.json({
      environment,
      stripe,
      firebase,
      user,
      timestamp: new Date().toISOString(),
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
