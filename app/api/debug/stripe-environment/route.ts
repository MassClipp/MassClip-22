import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET() {
  try {
    console.log("🔍 [Stripe Environment] Checking environment...")

    const secretKey = process.env.STRIPE_SECRET_KEY!
    const isTestMode = secretKey.startsWith("sk_test_")
    const isLiveMode = secretKey.startsWith("sk_live_")

    // Get partial key info for display (hide most of it for security)
    const keyInfo = secretKey.substring(0, 12) + "..." + secretKey.slice(-4)

    console.log("🧪 [Stripe Environment] Mode:", isTestMode ? "TEST" : isLiveMode ? "LIVE" : "UNKNOWN")

    let warning = ""
    if (!isTestMode && !isLiveMode) {
      warning = "Invalid Stripe API key format detected"
    }

    // Try to make a simple API call to verify the key works
    let apiWorking = false
    try {
      await stripe.balance.retrieve()
      apiWorking = true
      console.log("✅ [Stripe Environment] API key is working")
    } catch (error: any) {
      console.error("❌ [Stripe Environment] API key error:", error.message)
      warning = `API key error: ${error.message}`
    }

    return NextResponse.json({
      isTestMode,
      isLiveMode,
      keyInfo,
      nodeEnv: process.env.NODE_ENV,
      apiWorking,
      warning: warning || undefined,
    })
  } catch (error: any) {
    console.error("❌ [Stripe Environment] Error:", error.message)
    return NextResponse.json(
      {
        error: "Failed to check Stripe environment",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
