import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      ...(email && { customer_details: { email } }),
    })

    const sessionData = await Promise.all(
      sessions.data.map(async (session) => {
        let subscription = null
        if (session.subscription) {
          try {
            subscription = await stripe.subscriptions.retrieve(
              typeof session.subscription === "string" ? session.subscription : session.subscription.id,
            )
          } catch (e) {
            console.error("Failed to retrieve subscription:", e)
          }
        }

        return {
          id: session.id,
          status: session.status,
          customer_email: session.customer_email,
          client_reference_id: session.client_reference_id,
          metadata: session.metadata,
          subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          subscription_metadata: subscription?.metadata,
          created: new Date(session.created * 1000).toISOString(),
          amount_total: session.amount_total,
          currency: session.currency,
        }
      }),
    )

    return NextResponse.json({ sessions: sessionData })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch sessions",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
