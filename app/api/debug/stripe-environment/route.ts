import { NextResponse } from "next/server"

export async function GET() {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const isProduction = process.env.NODE_ENV === "production"

    if (!secretKey) {
      return NextResponse.json({
        error: "No Stripe secret key found",
        isTestMode: null,
        nodeEnv: process.env.NODE_ENV,
      })
    }

    const isTestMode = secretKey.startsWith("sk_test_")
    const isLiveMode = secretKey.startsWith("sk_live_")

    let warning = null

    // Check for environment mismatches
    if (isProduction && isTestMode) {
      warning = "⚠️ WARNING: Running in production but using test keys!"
    } else if (!isProduction && isLiveMode) {
      warning = "⚠️ WARNING: Running in development but using live keys!"
    }

    return NextResponse.json({
      isTestMode,
      isLiveMode,
      nodeEnv: process.env.NODE_ENV,
      keyInfo: `${secretKey.substring(0, 12)}...${secretKey.substring(secretKey.length - 4)}`,
      warning,
      keyType: isTestMode ? "TEST" : isLiveMode ? "LIVE" : "UNKNOWN",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to check environment",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
