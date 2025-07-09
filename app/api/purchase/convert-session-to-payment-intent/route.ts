import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")
    const accountId = searchParams.get("account_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
    }

    console.log(`🔍 [Convert Session] Converting session ${sessionId} to payment intent`)

    // Retrieve the session to get the payment intent
    let session
    try {
      if (accountId) {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          stripeAccount: accountId,
        })
      } else {
        session = await stripe.checkout.sessions.retrieve(sessionId)
      }
    } catch (stripeError: any) {
      console.error(`❌ [Convert Session] Stripe error:`, stripeError)
      return NextResponse.json(
        {
          error: "Failed to retrieve session from Stripe",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    if (!session.payment_intent) {
      return NextResponse.json({ error: "No payment intent found in session" }, { status: 400 })
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id

    console.log(`✅ [Convert Session] Found payment intent: ${paymentIntentId}`)

    // Build the redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || ""
    let redirectUrl = `${baseUrl}/success?payment_intent=${paymentIntentId}`

    if (accountId) {
      redirectUrl += `&account_id=${accountId}`
    }

    return NextResponse.redirect(redirectUrl)
  } catch (error: any) {
    console.error(`❌ [Convert Session] Error:`, error)
    return NextResponse.json(
      {
        error: "Session conversion failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
