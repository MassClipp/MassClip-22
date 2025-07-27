import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Environment Debug] Checking environment status...")

    const environmentStatus = {
      stripeMode: "UNKNOWN",
      stripeKeyPrefix: "NOT_SET",
      webhookConfigured: false,
      firebaseConnected: false,
      environment: process.env.NODE_ENV || "unknown",
      stripeConnected: false,
      apiEndpointsAvailable: [] as string[],
      timestamp: new Date().toISOString(),
      errors: [] as string[],
    }

    // Check Stripe Configuration
    try {
      const secretKey = process.env.STRIPE_SECRET_KEY
      if (secretKey) {
        environmentStatus.stripeKeyPrefix = secretKey.substring(0, 8)
        environmentStatus.stripeMode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST"

        // Test Stripe connection
        const account = await stripe.accounts.retrieve()
        environmentStatus.stripeConnected = true
        console.log("✅ [Environment Debug] Stripe connected:", account.id)
      } else {
        environmentStatus.errors.push("STRIPE_SECRET_KEY not configured")
      }
    } catch (error: any) {
      console.error("❌ [Environment Debug] Stripe connection failed:", error)
      environmentStatus.errors.push(`Stripe error: ${error.message}`)
    }

    // Check Firebase Connection
    try {
      // Try to read from Firestore to test connection
      const testQuery = await db.collection("users").limit(1).get()
      environmentStatus.firebaseConnected = true
      console.log("✅ [Environment Debug] Firebase connected")
    } catch (error: any) {
      console.error("❌ [Environment Debug] Firebase connection failed:", error)
      environmentStatus.firebaseConnected = false
      environmentStatus.errors.push(`Firebase error: ${error.message}`)
    }

    // Check Webhook Configuration
    try {
      const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 })
      const currentDomain = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL

      if (currentDomain) {
        const hasWebhook = webhookEndpoints.data.some(
          (webhook) =>
            webhook.url.includes(currentDomain) ||
            webhook.url.includes("massclip.pro") ||
            webhook.url.includes("localhost"),
        )
        environmentStatus.webhookConfigured = hasWebhook

        if (hasWebhook) {
          console.log("✅ [Environment Debug] Webhook configured")
        } else {
          console.log("⚠️ [Environment Debug] No webhook found for current domain")
          environmentStatus.errors.push("No webhook configured for current domain")
        }
      }
    } catch (error: any) {
      console.error("❌ [Environment Debug] Webhook check failed:", error)
      environmentStatus.errors.push(`Webhook check failed: ${error.message}`)
    }

    // List available API endpoints
    environmentStatus.apiEndpointsAvailable = [
      "/api/purchase/verify-session",
      "/api/debug/stripe-environment",
      "/api/debug/purchase-session-analysis",
      "/api/stripe/webhook/route",
      "/api/health",
    ]

    console.log("✅ [Environment Debug] Environment check complete:", {
      stripeMode: environmentStatus.stripeMode,
      stripeConnected: environmentStatus.stripeConnected,
      firebaseConnected: environmentStatus.firebaseConnected,
      webhookConfigured: environmentStatus.webhookConfigured,
      errorsCount: environmentStatus.errors.length,
    })

    return NextResponse.json(environmentStatus)
  } catch (error: any) {
    console.error("❌ [Environment Debug] Environment check failed:", error)
    return NextResponse.json(
      {
        error: "Environment check failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
