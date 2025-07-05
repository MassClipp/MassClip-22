import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("🔍 [Debug] Retrieving Stripe session:", sessionId)

    // Check environment configuration
    const environment = {
      stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
      isLiveMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"),
      sessionIdPrefix: sessionId.substring(0, 7),
      sessionIsTest: sessionId.startsWith("cs_test_"),
      sessionIsLive: sessionId.startsWith("cs_live_"),
    }

    console.log("🔧 [Debug] Environment check:", environment)

    // Check for test/live mode mismatch
    if (environment.isTestMode && environment.sessionIsLive) {
      return NextResponse.json(
        {
          error: "Test/Live mode mismatch",
          details: "You're using a test Stripe key but trying to access a live session",
          environment,
          recommendation: "Either use a live Stripe key or use a test session ID (cs_test_...)",
        },
        { status: 400 },
      )
    }

    if (environment.isLiveMode && environment.sessionIsTest) {
      return NextResponse.json(
        {
          error: "Test/Live mode mismatch",
          details: "You're using a live Stripe key but trying to access a test session",
          environment,
          recommendation: "Either use a test Stripe key or use a live session ID (cs_live_...)",
        },
        { status: 400 },
      )
    }

    // Retrieve the Stripe session with all details
    let session: Stripe.Checkout.Session
    let lineItems: Stripe.ApiList<Stripe.LineItem> | null = null

    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items", "line_items.data.price.product"],
      })

      // Get line items separately for more details
      lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
        expand: ["data.price.product"],
      })
    } catch (stripeError: any) {
      console.error("❌ [Debug] Stripe error:", stripeError)

      return NextResponse.json(
        {
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          requestId: stripeError.requestId,
          environment,
          recommendation:
            stripeError.statusCode === 404
              ? "Check if the session ID is correct and matches your Stripe account mode (test/live)"
              : "Check your Stripe configuration and try again",
        },
        { status: stripeError.statusCode || 500 },
      )
    }

    const debugInfo = {
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        metadata: session.metadata,
        created: new Date(session.created * 1000).toISOString(),
        expires_at: new Date(session.expires_at * 1000).toISOString(),
        payment_intent: session.payment_intent,
        mode: session.mode,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
      },
      lineItems:
        lineItems?.data.map((item) => ({
          id: item.id,
          amount_total: item.amount_total,
          currency: item.currency,
          description: item.description,
          quantity: item.quantity,
          price: {
            id: item.price?.id,
            unit_amount: item.price?.unit_amount,
            currency: item.price?.currency,
            product: item.price?.product,
          },
        })) || [],
      environment,
    }

    console.log("✅ [Debug] Session retrieved successfully")
    return NextResponse.json(debugInfo)
  } catch (error: any) {
    console.error("❌ [Debug] Error retrieving session:", error)

    return NextResponse.json(
      {
        error: error.message || "Unknown error",
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
      },
      { status: error.statusCode || 500 },
    )
  }
}
