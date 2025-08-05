import { NextResponse } from "next/server"

export async function GET() {
  console.log("🧪 Test endpoint hit at:", new Date().toISOString())

  return NextResponse.json({
    status: "working",
    message: "Test endpoint is functioning",
    timestamp: new Date().toISOString(),
    environment: {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasLiveWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET_LIVE,
      hasTestWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
      nodeEnv: process.env.NODE_ENV,
    },
  })
}

export async function POST() {
  console.log("🧪 Test POST endpoint hit at:", new Date().toISOString())

  return NextResponse.json({
    status: "working",
    message: "Test POST endpoint is functioning",
    timestamp: new Date().toISOString(),
  })
}
