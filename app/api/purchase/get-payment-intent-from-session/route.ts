import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Session Converter] === CONVERTING SESSION TO PAYMENT INTENT ===`)

    const decodedToken = await requireAuth(request)
    const { sessionId, accountId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    console.log(`🔍 [Session Converter] Session ID: ${sessionId}`)
    console.log(`🔍 [Session Converter] Account ID: ${accountId || "none"}`)
    console.log(`🔍 [Session Converter] User: ${decodedToken.uid}`)

    // Retrieve the checkout session from Stripe
    let session
    try {
      if (accountId) {
        // Session was created on a connected account
        console.log(`🔍 [Session Converter] Retrieving session from connected account: ${accountId}`)
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          stripeAccount: accountId,
        })
      } else {
        // Session was created on the platform account
        console.log(`🔍 [Session Converter] Retrieving session from platform account`)
        session = await stripe.checkout.sessions.retrieve(sessionId)
      }
    } catch (stripeError: any) {
      console.error(`❌ [Session Converter] Failed to retrieve session:`, stripeError)
      return NextResponse.json(
        {
          error: "Failed to retrieve checkout session",
          details: stripeError.message,
          code: stripeError.code,
        },
        { status: 400 },
      )
    }

    console.log(`✅ [Session Converter] Session retrieved:`, {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent,
      mode: session.mode,
      amountTotal: session.amount_total,
      currency: session.currency,
    })

    // Validate session
    if (session.payment_status !== "paid") {
      console.error(`❌ [Session Converter] Session not paid: ${session.payment_status}`)
      return NextResponse.json(
        {
          error: "Payment not completed",
          paymentStatus: session.payment_status,
          sessionStatus: session.status,
        },
        { status: 400 },
      )
    }

    if (!session.payment_intent) {
      console.error(`❌ [Session Converter] No payment intent found in session`)
      return NextResponse.json({ error: "No payment intent found in session" }, { status: 400 })
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id

    console.log(`✅ [Session Converter] Payment Intent ID extracted: ${paymentIntentId}`)

    return NextResponse.json({
      success: true,
      paymentIntentId,
      sessionData: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Session Converter] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
