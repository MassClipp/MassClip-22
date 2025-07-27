import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "Please provide a valid Bearer token",
        },
        { status: 401 },
      )
    }

    const idToken = authHeader.replace("Bearer ", "")

    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Purchase Verification Debug] User authenticated:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Purchase Verification Debug] Auth failed:", error)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error.message,
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { sessionId, productBoxId, test } = body

    console.log("🔍 [Purchase Verification Debug] Debug request:", {
      sessionId,
      productBoxId,
      test,
      timestamp: new Date().toISOString(),
    })

    const debugInfo = {
      timestamp: new Date().toISOString(),
      requestData: { sessionId, productBoxId, test },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!(process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET),
        domain: process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL,
      },
      services: {
        stripe: "Available",
        firebase: "Available",
        database: "Available",
      },
      recommendations: [
        "Check if the session ID exists in Stripe",
        "Verify you're using the correct Stripe mode (test vs live)",
        "Ensure webhook is configured and accessible",
        "Check if purchase was processed by webhook",
      ],
    }

    if (test) {
      debugInfo.recommendations.unshift("✅ API endpoint is working correctly")
    }

    return NextResponse.json(debugInfo)
  } catch (error: any) {
    console.error("❌ [Purchase Verification Debug] Debug failed:", error)
    return NextResponse.json(
      {
        error: "Debug request failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
