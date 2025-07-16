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
    if (accountId) {
      console.log(`🔍 [Convert Session] Using connected account: ${accountId}`)
    }

    // Retrieve the session to get the payment intent
    let session
    try {
      if (accountId) {
        // For connected accounts, we need to specify the Stripe account
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          stripeAccount: accountId,
        })
      } else {
        // For platform account sessions
        session = await stripe.checkout.sessions.retrieve(sessionId)
      }
    } catch (stripeError: any) {
      console.error(`❌ [Convert Session] Stripe error:`, stripeError)

      // If we failed with connected account, try without it
      if (accountId && stripeError.code === "resource_missing") {
        console.log(`🔄 [Convert Session] Retrying without connected account`)
        try {
          session = await stripe.checkout.sessions.retrieve(sessionId)
        } catch (retryError: any) {
          console.error(`❌ [Convert Session] Retry failed:`, retryError)
          return NextResponse.json(
            {
              error: "Failed to retrieve session from Stripe",
              details: retryError.message,
              sessionId: sessionId,
              accountId: accountId,
            },
            { status: 400 },
          )
        }
      } else {
        return NextResponse.json(
          {
            error: "Failed to retrieve session from Stripe",
            details: stripeError.message,
            sessionId: sessionId,
            accountId: accountId,
          },
          { status: 400 },
        )
      }
    }

    if (!session.payment_intent) {
      return NextResponse.json(
        {
          error: "No payment intent found in session",
          sessionId: sessionId,
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
        },
        { status: 400 },
      )
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id

    console.log(`✅ [Convert Session] Found payment intent: ${paymentIntentId}`)

    // Build the redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || ""
    let redirectUrl = `${baseUrl}/payment-success?payment_intent=${paymentIntentId}`

    // Include the account ID if it was used
    if (accountId) {
      redirectUrl += `&account_id=${accountId}`
    }

    // Include any additional metadata from the session
    if (session.metadata?.product_box_id) {
      redirectUrl += `&product_box_id=${session.metadata.product_box_id}`
    }

    console.log(`🔄 [Convert Session] Redirecting to: ${redirectUrl}`)

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
