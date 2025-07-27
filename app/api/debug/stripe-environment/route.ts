import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Environment Debug] Checking environment status...")

    const environmentStatus = {
      stripeMode: "UNKNOWN",
      stripeKeyPrefix: "Not configured",
      webhookConfigured: false,
      firebaseConnected: false,
      environment: process.env.NODE_ENV || "unknown",
      stripeConnected: false,
      apiEndpointsAvailable: [] as string[],
      timestamp: new Date().toISOString(),
      errors: [] as string[],
      warnings: [] as string[],
    }

    // Check Stripe configuration
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey) {
        environmentStatus.stripeKeyPrefix = stripeKey.substring(0, 8)
        environmentStatus.stripeMode = stripeKey.startsWith("sk_live_") ? "LIVE" : "TEST"

        // Test Stripe connection
        const account = await stripe.accounts.retrieve()
        environmentStatus.stripeConnected = true
        console.log("✅ [Environment Debug] Stripe connected:", account.id)
      } else {
        environmentStatus.errors.push("STRIPE_SECRET_KEY not configured")
      }
    } catch (error: any) {
      console.error("❌ [Environment Debug] Stripe error:", error)
      environmentStatus.errors.push(`Stripe connection failed: ${error.message}`)
    }

    // Check Firebase connection
    try {
      // Test Firestore connection by attempting to read a collection
      const testQuery = await db.collection("users").limit(1).get()
      environmentStatus.firebaseConnected = true
      console.log("✅ [Environment Debug] Firebase connected")
    } catch (error: any) {
      console.error("❌ [Environment Debug] Firebase error:", error)
      environmentStatus.errors.push(`Firebase connection failed: ${error.message}`)
    }

    // Check webhook configuration
    try {
      if (environmentStatus.stripeConnected) {
        const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 })
        const currentDomain = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL

        if (currentDomain) {
          const hasWebhook = webhookEndpoints.data.some(
            (webhook) => webhook.url.includes(currentDomain) || webhook.url.includes("massclip.pro"),
          )
          environmentStatus.webhookConfigured = hasWebhook

          if (!hasWebhook) {
            environmentStatus.warnings.push("No webhook configured for current domain")
          }
        } else {
          environmentStatus.warnings.push("NEXT_PUBLIC_SITE_URL not configured")
        }
      }
    } catch (error: any) {
      console.error("❌ [Environment Debug] Webhook check error:", error)
      environmentStatus.warnings.push(`Could not check webhook configuration: ${error.message}`)
    }

    // Check environment variables
    const requiredEnvVars = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_SITE_URL",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ]

    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])
    if (missingEnvVars.length > 0) {
      environmentStatus.errors.push(`Missing environment variables: ${missingEnvVars.join(", ")}`)
    }

    // Check webhook secrets
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      environmentStatus.errors.push("No webhook secret configured")
    }

    // List available API endpoints (this is a simplified check)
    environmentStatus.apiEndpointsAvailable = [
      "/api/purchase/verify-session",
      "/api/debug/stripe-environment",
      "/api/debug/purchase-session-analysis",
      "/api/stripe/checkout",
      "/api/health",
      "/api/webhooks/stripe",
    ]

    console.log("✅ [Environment Debug] Environment check complete")
    console.log("   Stripe Mode:", environmentStatus.stripeMode)
    console.log("   Firebase Connected:", environmentStatus.firebaseConnected)
    console.log("   Webhook Configured:", environmentStatus.webhookConfigured)
    console.log("   Errors:", environmentStatus.errors.length)
    console.log("   Warnings:", environmentStatus.warnings.length)

    return NextResponse.json(environmentStatus)
  } catch (error: any) {
    console.error("❌ [Environment Debug] Check failed:", error)
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
