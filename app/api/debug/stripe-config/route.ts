import { NextResponse } from "next/server"
import { getStripeDebugInfo } from "@/lib/stripe-dynamic"

export async function GET() {
  try {
    const debugInfo = getStripeDebugInfo()

    return NextResponse.json({
      stripeKeyExists: debugInfo.hasTestKey || debugInfo.hasLiveKey,
      stripeKeyPrefix: debugInfo.testKeyPrefix || debugInfo.liveKeyPrefix || "none",
      isTestMode: !!debugInfo.hasTestKey,
      isLiveMode: !!debugInfo.hasLiveKey,
      environment: debugInfo.environment,
      isProduction: debugInfo.isProduction,
      timestamp: new Date().toISOString(),
      availableKeys: {
        test: debugInfo.hasTestKey,
        live: debugInfo.hasLiveKey,
      },
      keyPrefixes: {
        test: debugInfo.testKeyPrefix,
        live: debugInfo.liveKeyPrefix,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get Stripe configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
