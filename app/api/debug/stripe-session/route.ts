import { NextResponse } from "next/server"
import { validateStripeSession } from "@/lib/stripe-client"

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    console.log(`🔍 [Debug API] Starting session debug for: ${sessionId?.substring(0, 20)}...`)

    if (!sessionId) {
      console.error("❌ [Debug API] Missing session ID")
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
          recommendation: "Please provide a valid Stripe session ID (cs_test_... or cs_live_...)",
        },
        { status: 400 },
      )
    }

    // Validate session ID format
    if (!sessionId.startsWith("cs_test_") && !sessionId.startsWith("cs_live_")) {
      console.error("❌ [Debug API] Invalid session ID format:", sessionId.substring(0, 20))
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session ID format",
          recommendation: "Session ID must start with 'cs_test_' or 'cs_live_'",
          debug: {
            providedSessionId: sessionId.substring(0, 20) + "...",
            expectedFormat: "cs_test_... or cs_live_...",
          },
        },
        { status: 400 },
      )
    }

    console.log(`✅ [Debug API] Session ID format valid: ${sessionId.startsWith("cs_test_") ? "test" : "live"}`)

    // Use the stripe client utility to validate the session
    const result = await validateStripeSession(sessionId)

    if (result.success) {
      console.log("✅ [Debug API] Session validation successful")
      return NextResponse.json({
        success: true,
        session: result.session,
        stripeConfig: result.stripeConfig,
        debug: result.debug,
        recommendation: "Session found and valid. You can proceed with purchase verification.",
      })
    } else {
      console.error("❌ [Debug API] Session validation failed:", result.debug)

      let recommendation = "Check your Stripe configuration and try again."
      let configurationSteps: string[] = []

      // Provide specific recommendations based on the error
      if (result.debug?.statusCode === 404) {
        recommendation =
          "Session not found. This could mean the session was never created, has expired, or exists in a different Stripe account."
        configurationSteps = [
          "Check if the session exists in your Stripe dashboard",
          "Verify you're using the correct Stripe account",
          "Ensure test/live mode consistency",
          "Check if the session has expired (24 hour limit)",
        ]
      } else if (result.debug?.errorCode === "testmode_charges_only") {
        recommendation = "You're trying to access a live session with test keys, or vice versa."
        configurationSteps = [
          "Use test keys (sk_test_...) for test sessions (cs_test_...)",
          "Use live keys (sk_live_...) for live sessions (cs_live_...)",
          "Check your STRIPE_SECRET_KEY environment variable",
        ]
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Session validation failed",
          debug: result.debug,
          recommendation,
          configurationSteps,
        },
        { status: result.debug?.statusCode || 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Debug API] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during session debug",
        details: error.message,
        recommendation: "Check server logs for more details. This might be a configuration or network issue.",
      },
      { status: 500 },
    )
  }
}
