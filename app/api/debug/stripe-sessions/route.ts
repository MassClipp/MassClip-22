import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: limit,
      expand: ["data.customer", "data.subscription"],
    })

    const filteredSessions = email
      ? sessions.data.filter(
          (session) => session.customer_details?.email === email || session.metadata?.buyerEmail === email,
        )
      : sessions.data

    const sessionDetails = await Promise.all(
      filteredSessions.map(async (session) => {
        let subscriptionDetails = null
        if (session.subscription) {
          try {
            subscriptionDetails = await stripe.subscriptions.retrieve(session.subscription as string, {
              expand: ["customer"],
            })
          } catch (error) {
            console.error("Error fetching subscription:", error)
          }
        }

        return {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
          customer_id: session.customer,
          subscription_id: session.subscription,
          metadata: session.metadata,
          client_reference_id: session.client_reference_id,
          created: new Date(session.created * 1000).toISOString(),
          subscription_metadata: subscriptionDetails?.metadata || null,
        }
      }),
    )

    return NextResponse.json({
      sessions: sessionDetails,
      total: filteredSessions.length,
      email_filter: email,
    })
  } catch (error) {
    console.error("Error fetching Stripe sessions:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
