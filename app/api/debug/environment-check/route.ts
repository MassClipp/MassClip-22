import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔍 [Environment Check] Checking environment variables...")

    const requiredEnvVars = [
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_BASE_URL",
    ]

    const envStatus: Record<string, any> = {}
    let allPresent = true

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      const isPresent = !!value

      if (!isPresent) {
        allPresent = false
      }

      envStatus[envVar] = {
        present: isPresent,
        hasValue: isPresent && value.length > 0,
        // Only show first/last few characters for security
        preview: isPresent ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : null,
        length: isPresent ? value.length : 0,
      }
    }

    // Check for Stripe test vs live mode
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const isTestMode = stripeKey?.startsWith("sk_test_")
    const isLiveMode = stripeKey?.startsWith("sk_live_")

    console.log(
      `✅ [Environment Check] Found ${Object.keys(envStatus).filter((k) => envStatus[k].present).length}/${requiredEnvVars.length} required variables`,
    )

    return NextResponse.json({
      success: true,
      allPresent,
      totalRequired: requiredEnvVars.length,
      totalPresent: Object.keys(envStatus).filter((k) => envStatus[k].present).length,
      stripeMode: {
        isTest: isTestMode,
        isLive: isLiveMode,
        detected: isTestMode ? "test" : isLiveMode ? "live" : "unknown",
      },
      variables: envStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ [Environment Check] Failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        allPresent: false,
      },
      { status: 500 },
    )
  }
}
