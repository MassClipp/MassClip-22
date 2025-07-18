import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Stripe Environment] Checking environment status`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error(`❌ [Stripe Environment] Authentication failed`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    const isLiveMode = stripeSecretKey?.startsWith("sk_live_")
    const stripeKeyPrefix = stripeSecretKey?.substring(0, 12) || "Not configured"

    // Check Firebase configuration
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID
    const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
    const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL

    const firebaseConnected = !!(firebaseProjectId && firebasePrivateKey && firebaseClientEmail)

    const environmentStatus = {
      stripeMode: isLiveMode ? "LIVE" : "TEST",
      stripeKeyPrefix,
      webhookConfigured: !!stripeWebhookSecret,
      firebaseConnected,
      environment: process.env.NODE_ENV || "development",
    }

    console.log(`✅ [Stripe Environment] Environment status checked`)

    return NextResponse.json(environmentStatus)
  } catch (error: any) {
    console.error(`❌ [Stripe Environment] Error:`, error)
    return NextResponse.json(
      {
        stripeMode: "UNKNOWN",
        stripeKeyPrefix: "Error",
        webhookConfigured: false,
        firebaseConnected: false,
        environment: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
