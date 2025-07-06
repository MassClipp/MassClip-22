import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: "Session ID is required",
      })
    }

    console.log("🔍 [Session Debug] Debugging session:", sessionId)

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({
        success: false,
        error: "Stripe configuration error: Missing secret key",
        recommendations: [
          "Check that STRIPE_SECRET_KEY is set in environment variables",
          "Verify the key is not empty or malformed",
        ],
      })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })
    const keyType = stripeKey.startsWith("sk_test_") ? "test" : "live"

    console.log("🔑 [Session Debug] Using Stripe key type:", keyType)

    try {
      // Retrieve the session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
      })

      console.log("✅ [Session Debug] Session found:", {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
      })

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_email,
          created: session.created,
          expires_at: session.expires_at,
          metadata: session.metadata,
          url: session.url,
          success_url: session.success_url,
          cancel_url: session.cancel_url,
          line_items: session.line_items?.data,
          payment_intent: session.payment_intent,
        },
        keyType,
      })
    } catch (stripeError: any) {
      console.error("❌ [Session Debug] Stripe error:", stripeError)

      let recommendations: string[] = []
      let errorMessage = "Unknown Stripe error"

      if (stripeError.code === "resource_missing") {
        errorMessage = "Session not found"
        recommendations = [
          "Verify the session ID is correct and complete",
          `Check if you're using ${keyType} keys with the correct session type`,
          "Sessions expire after 24 hours - check if the session is still valid",
          "Ensure the session was created successfully in the first place",
        ]
      } else if (stripeError.code === "invalid_request_error") {
        errorMessage = "Invalid session ID format"
        recommendations = [
          "Session IDs should start with 'cs_test_' or 'cs_live_'",
          "Check for any extra characters or truncation",
        ]
      } else {
        errorMessage = stripeError.message || "Stripe API error"
        recommendations = [
          "Check Stripe dashboard for more details",
          "Verify API key permissions",
          "Check Stripe service status",
        ]
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        stripeError: {
          code: stripeError.code,
          type: stripeError.type,
          message: stripeError.message,
        },
        recommendations,
        keyType,
      })
    }
  } catch (error) {
    console.error("❌ [Session Debug] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Unexpected error during session debug",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
