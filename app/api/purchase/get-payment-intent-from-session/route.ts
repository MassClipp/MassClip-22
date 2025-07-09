import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await requireAuth(request)
    const { sessionId, accountId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    console.log(`🔄 [Session Converter] Converting session ${sessionId} to payment intent`)
    console.log(`🔄 [Session Converter] Account ID: ${accountId || "none"}`)

    // Retrieve the session from Stripe
    let session
    try {
      if (accountId) {
        // Retrieve from connected account
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["payment_intent"],
          stripeAccount: accountId,
        })
      } else {
        // Retrieve from platform account
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["payment_intent"],
        })
      }
    } catch (stripeError: any) {
      console.error(`❌ [Session Converter] Stripe error:`, stripeError)
      return NextResponse.json(
        {
          error: "Failed to retrieve session from Stripe",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Extract payment intent ID
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id

    if (!paymentIntentId) {
      return NextResponse.json(
        {
          error: "No payment intent found in session",
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
        },
        { status: 400 },
      )
    }

    console.log(
      `✅ [Session Converter] Successfully converted session ${sessionId} to payment intent ${paymentIntentId}`,
    )

    return NextResponse.json({
      success: true,
      sessionId,
      paymentIntentId,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      accountId: accountId || null,
    })
  } catch (error: any) {
    console.error(`❌ [Session Converter] Error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
