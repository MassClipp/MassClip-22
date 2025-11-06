import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET(request: Request) {
  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Missing Stripe secret key" }, { status: 500 })
  }

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get the URL parameters
    const url = new URL(request.url)
    const sessionId = url.searchParams.get("session_id")
    const customerId = url.searchParams.get("customer_id")
    const subscriptionId = url.searchParams.get("subscription_id")

    const results: Record<string, any> = {
      apiVersion: "2023-10-16",
      mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "test" : "live",
    }

    // Check session if provided
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription", "customer"],
        })
        results.session = {
          id: session.id,
          metadata: session.metadata,
          customer_email: session.customer_email,
          customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        }

        if (typeof session.subscription !== "string" && session.subscription) {
          results.session.subscription_metadata = session.subscription.metadata
        }

        if (typeof session.customer !== "string" && session.customer) {
          results.session.customer_metadata = session.customer.metadata
        }
      } catch (error) {
        results.session_error = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // Check customer if provided
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (!customer.deleted) {
          results.customer = {
            id: customer.id,
            email: customer.email,
            metadata: customer.metadata,
          }
        } else {
          results.customer_error = "Customer has been deleted"
        }
      } catch (error) {
        results.customer_error = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // Check subscription if provided
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        results.subscription = {
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
          customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        }
      } catch (error) {
        results.subscription_error = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // If no specific IDs provided, get recent sessions, customers, and subscriptions
    if (!sessionId && !customerId && !subscriptionId) {
      try {
        const sessions = await stripe.checkout.sessions.list({ limit: 5 })
        results.recent_sessions = sessions.data.map((session) => ({
          id: session.id,
          created: new Date(session.created * 1000).toISOString(),
          metadata: session.metadata,
          customer_email: session.customer_email,
          customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        }))
      } catch (error) {
        results.sessions_error = error instanceof Error ? error.message : "Unknown error"
      }

      try {
        const customers = await stripe.customers.list({ limit: 5 })
        results.recent_customers = customers.data.map((customer) => ({
          id: customer.id,
          email: customer.email,
          metadata: customer.metadata,
        }))
      } catch (error) {
        results.customers_error = error instanceof Error ? error.message : "Unknown error"
      }

      try {
        const subscriptions = await stripe.subscriptions.list({ limit: 5 })
        results.recent_subscriptions = subscriptions.data.map((subscription) => ({
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
          customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        }))
      } catch (error) {
        results.subscriptions_error = error instanceof Error ? error.message : "Unknown error"
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
