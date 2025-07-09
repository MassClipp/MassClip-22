import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Session Converter] Starting session to payment intent conversion")

    const decodedToken = await requireAuth(request)
    const { sessionId, accountId } = await request.json()

    if (!sessionId) {
      console.error("❌ [Session Converter] Missing session ID")
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Session Converter] Converting session: ${sessionId}`)
    console.log(`🏦 [Session Converter] Account ID: ${accountId || "none"}`)

    try {
      // Retrieve the checkout session from Stripe
      const stripeOptions = accountId ? { stripeAccount: accountId } : {}
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
        ...stripeOptions,
      })

      console.log(`✅ [Session Converter] Session retrieved:`, {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      })

      // Extract payment intent ID
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id

      if (!paymentIntentId) {
        console.error("❌ [Session Converter] No payment intent found in session")
        return NextResponse.json(
          {
            success: false,
            error: "No payment intent found in checkout session",
          },
          { status: 400 },
        )
      }

      console.log(`✅ [Session Converter] Payment intent extracted: ${paymentIntentId}`)

      return NextResponse.json({
        success: true,
        paymentIntentId,
        sessionId,
        accountId: accountId || null,
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
      })
    } catch (stripeError: any) {
      console.error("❌ [Session Converter] Stripe error:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve checkout session from Stripe",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Session Converter] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
