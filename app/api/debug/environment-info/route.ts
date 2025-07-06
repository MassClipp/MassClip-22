import { NextResponse } from "next/server"

export async function GET() {
  try {
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasStripeTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
      stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "live",
      hasFirebaseConfig: !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ),
      timestamp: new Date().toISOString(),
    }

    console.log("🌍 [Environment Info]:", envInfo)

    return NextResponse.json({
      success: true,
      environment: envInfo,
    })
  } catch (error) {
    console.error("❌ [Environment Info] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to get environment info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
