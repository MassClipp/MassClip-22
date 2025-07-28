import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    console.log("🔍 [Environment Debug] Checking environment status...")

    const status = {
      stripeMode: "UNKNOWN",
      stripeKeyPrefix: "Not configured",
      stripeConnected: false,
      webhookConfigured: false,
      firebaseConnected: false,
      environment: process.env.NODE_ENV || "unknown",
      apiEndpointsAvailable: [] as string[],
      timestamp: new Date().toISOString(),
    }

    // Check Stripe configuration
    try {
      const secretKey = process.env.STRIPE_SECRET_KEY
      if (secretKey) {
        status.stripeKeyPrefix = secretKey.substring(0, 8)
        status.stripeMode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST"

        // Test Stripe connection
        const account = await stripe.accounts.retrieve()
        status.stripeConnected = true
        console.log("✅ [Environment Debug] Stripe connected:", account.id)
      } else {
        console.log("❌ [Environment Debug] No Stripe secret key found")
      }
    } catch (error: any) {
      console.error("❌ [Environment Debug] Stripe connection failed:", error)
      status.stripeConnected = false
    }

    // Check webhook configuration
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
      const currentDomain = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      status.webhookConfigured = webhooks.data.some((webhook) => {
        return currentDomain && webhook.url.includes(currentDomain)
      })
      console.log("🔗 [Environment Debug] Webhook configured:", status.webhookConfigured)
    } catch (error) {
      console.log("⚠️ [Environment Debug] Could not check webhooks")
    }

    // Check Firebase connection
    try {
      const testDoc = await db.collection("_test").doc("connection").get()
      status.firebaseConnected = true
      console.log("✅ [Environment Debug] Firebase connected")
    } catch (error: any) {
      console.error("❌ [Environment Debug] Firebase connection failed:", error)
      status.firebaseConnected = false
    }

    // List available API endpoints (this is a simplified check)
    const commonEndpoints = [
      "/api/purchase/verify-session",
      "/api/debug/stripe-environment",
      "/api/debug/purchase-verification",
      "/api/stripe/checkout",
      "/api/health",
    ]

    status.apiEndpointsAvailable = commonEndpoints

    console.log("✅ [Environment Debug] Status check complete")
    return NextResponse.json(status)
  } catch (error: any) {
    console.error("❌ [Environment Debug] Status check failed:", error)
    return NextResponse.json(
      {
        error: "Failed to check environment status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
