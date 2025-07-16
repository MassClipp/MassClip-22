import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)

    const { sessionId, accountId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    console.log(`🔍 [Get Payment Intent] Converting session ${sessionId} to payment intent`)
    if (accountId) {
      console.log(`🔍 [Get Payment Intent] Using connected account: ${accountId}`)
    }

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
      console.error(`❌ [Get Payment Intent] Stripe error:`, stripeError)

      // If we failed with connected account, try without it
      if (accountId && stripeError.code === "resource_missing") {
        console.log(`🔄 [Get Payment Intent] Retrying without connected account`)
        try {
          session = await stripe.checkout.sessions.retrieve(sessionId)
        } catch (retryError: any) {
          console.error(`❌ [Get Payment Intent] Retry failed:`, retryError)
          return NextResponse.json(
            {
              error: "Failed to retrieve session from Stripe",
              details: retryError.message,
            },
            { status: 400 },
          )
        }
      } else {
        return NextResponse.json(
          {
            error: "Failed to retrieve session from Stripe",
            details: stripeError.message,
          },
          { status: 400 },
        )
      }
    }

    if (!session.payment_intent) {
      return NextResponse.json(
        {
          error: "No payment intent found in session",
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
        },
        { status: 400 },
      )
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id

    console.log(`✅ [Get Payment Intent] Found payment intent: ${paymentIntentId}`)

    return NextResponse.json({
      paymentIntentId,
      sessionId,
      accountId,
      success: true,
    })
  } catch (error: any) {
    console.error(`❌ [Get Payment Intent] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to convert session to payment intent",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
