import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    console.log("🔍 [Stripe Test] Testing Stripe API connection...")

    // Test basic Stripe connection
    const account = await stripe.accounts.retrieve()

    console.log("✅ [Stripe Test] Successfully connected to Stripe")
    console.log("📊 [Stripe Test] Account details:", {
      id: account.id,
      country: account.country,
      email: account.email,
      type: account.type,
    })

    // Check if Connect is enabled
    let connectEnabled = false
    let connectError = null

    try {
      // Try to list connected accounts to test Connect permissions
      const connectedAccounts = await stripe.accounts.list({ limit: 1 })
      connectEnabled = true
      console.log("✅ [Stripe Test] Stripe Connect is enabled")
    } catch (connectErr: any) {
      connectEnabled = false
      connectError = connectErr.message
      console.warn("⚠️ [Stripe Test] Stripe Connect may not be enabled:", connectErr.message)
    }

    return NextResponse.json({
      connected: true,
      message: "Stripe connection successful",
      accountId: account.id,
      country: account.country,
      email: account.email,
      type: account.type,
      connectEnabled,
      connectError,
      testMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || false,
    })
  } catch (error: any) {
    console.error("❌ [Stripe Test] Connection failed:", error)

    return NextResponse.json(
      {
        connected: false,
        message: "Failed to connect to Stripe",
        error: error.message,
        code: error.code,
        type: error.type,
      },
      { status: 500 },
    )
  }
}
