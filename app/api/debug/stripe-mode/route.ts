import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    // Check which Stripe keys are being used
    const isProduction = process.env.NODE_ENV === "production" && !process.env.VERCEL_URL?.includes("vercel.app")

    const liveKeyExists = !!process.env.STRIPE_SECRET_KEY
    const testKeyExists = !!process.env.STRIPE_SECRET_KEY_TEST

    const currentKey = isProduction ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY_TEST

    const keyPrefix = currentKey?.substring(0, 12) || "NOT_SET"
    const isTestKey = keyPrefix.includes("sk_test")
    const isLiveKey = keyPrefix.includes("sk_live")

    // Try to make a simple API call to verify the key works
    let apiTest = null
    try {
      const account = await stripe.accounts.retrieve()
      apiTest = {
        success: true,
        accountId: account.id,
        country: account.country,
        type: account.type,
      }
    } catch (error: any) {
      apiTest = {
        success: false,
        error: error.message,
      }
    }

    return NextResponse.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        isProduction,
      },
      keys: {
        liveKeyExists,
        testKeyExists,
        currentKeyPrefix: keyPrefix,
        isTestKey,
        isLiveKey,
        shouldUseTestKey: !isProduction,
      },
      stripeApiTest: apiTest,
      recommendation: isProduction
        ? "Using LIVE mode - be careful with real payments!"
        : isTestKey
          ? "✅ Correctly using TEST mode"
          : "❌ Should be using TEST key but using LIVE key",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to check Stripe configuration",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
