import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function getDebugInfo(request: NextRequest): Promise<any> {
  const headersList = headers()
  const authHeader = headersList.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Authorization required" }
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

  return { environment, stripe, firebase, user }
}

export async function GET(request: NextRequest) {
  try {
    const debugInfo = await getDebugInfo(request)

    if ("error" in debugInfo) {
      return NextResponse.json({ error: debugInfo.error }, { status: 401 })
    }

    return NextResponse.json(debugInfo)
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
