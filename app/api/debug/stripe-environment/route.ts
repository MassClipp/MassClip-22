import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const environment = process.env.NODE_ENV || "development"

    if (!stripeSecretKey) {
      return NextResponse.json({
        error: "Stripe secret key not configured",
        stripeMode: "UNKNOWN",
        stripeKeyPrefix: "NOT_SET",
        webhookConfigured: false,
        firebaseConnected: false,
        environment,
      })
    }

    const stripeMode = stripeSecretKey.startsWith("sk_live_") ? "LIVE" : "TEST"
    const stripeKeyPrefix = stripeSecretKey.substring(0, 12)
    const webhookConfigured = !!webhookSecret

    // Check Firebase connection
    let firebaseConnected = false
    try {
      const firebaseProjectId = process.env.FIREBASE_PROJECT_ID
      const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
      const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL

      firebaseConnected = !!(firebaseProjectId && firebasePrivateKey && firebaseClientEmail)
    } catch (error) {
      console.error("Firebase connection check failed:", error)
    }

    return NextResponse.json({
      stripeMode,
      stripeKeyPrefix,
      webhookConfigured,
      firebaseConnected,
      environment,
    })
  } catch (error) {
    console.error("Environment status check failed:", error)
    return NextResponse.json(
      {
        error: "Failed to check environment status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
