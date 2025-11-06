import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const environmentCheck = {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "missing",
      webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasFirebaseConfig: !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ),
      timestamp: new Date().toISOString(),
    }

    console.log("🔧 [Environment Check] Environment variables status:", environmentCheck)

    return NextResponse.json({
      success: true,
      ...environmentCheck,
    })
  } catch (error: any) {
    console.error("❌ [Environment Check] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
