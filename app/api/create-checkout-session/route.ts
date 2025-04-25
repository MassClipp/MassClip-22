import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: Request) {
  console.log("------------ APP ROUTER CHECKOUT SESSION START ------------")

  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing environment variable: STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error("Missing environment variable: STRIPE_PRICE_ID")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe price ID" }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error("Missing environment variable: NEXT_PUBLIC_SITE_URL")
    return NextResponse.json({ error: "Server configuration error: Missing site URL" }, { status: 500 })
  }

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse the request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    // Get the user email from the request body
    const { userId, userEmail, email } = body || {}

    // Try to get email from different possible properties
    const customerEmail = userEmail || email || body?.user?.email

    if (!customerEmail) {
      console.error("MISSING EMAIL - Request body:", JSON.stringify(body))
      return NextResponse.json({ error: "Missing email in request body" }, { status: 400 })
    }

    if (!userId) {
      console.warn("⚠️ WARNING: Missing userId in request body. Metadata will be incomplete.")
      console.warn("Request body:", JSON.stringify(body))
    }

    console.log(`Creating checkout session for email: ${customerEmail}`)
    console.log(`User ID for metadata: ${userId || "NOT PROVIDED"}`)
    console.log("Using price ID:", process.env.STRIPE_PRICE_ID)
    console.log("Success URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success`)
    console.log("Cancel URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel`)

    // DIAGNOSTIC: Create metadata object separately for clarity
    const metadata = {
      email: customerEmail,
      firebaseUid: userId || "",
      plan: "pro",
      timestamp: new Date().toISOString(), // Add timestamp for debugging
    }

    console.log("METADATA BEING SENT TO STRIPE:", JSON.stringify(metadata, null, 2))

    // Create session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: customerEmail,
      metadata: metadata,
      // Add metadata to subscription_data to ensure it propagates to the subscription
      subscription_data: {
        metadata: metadata,
      },
      // REMOVED: payment_intent_data - not allowed in subscription mode
    }

    console.log("Session parameters:", JSON.stringify(sessionParams, null, 2))

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log("Session created with ID:", session.id)
    console.log("DIAGNOSTIC - Session metadata received from Stripe:", JSON.stringify(session.metadata, null, 2))
    console.log("Session URL:", session.url)

    // DIAGNOSTIC: Verify the session was created with metadata
    const retrievedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["subscription"],
    })
    console.log("DIAGNOSTIC - Retrieved session metadata:", JSON.stringify(retrievedSession.metadata, null, 2))

    if (retrievedSession.subscription) {
      console.log(
        "DIAGNOSTIC - Subscription metadata:",
        typeof retrievedSession.subscription === "string"
          ? "Subscription not expanded"
          : JSON.stringify(retrievedSession.subscription.metadata, null, 2),
      )
    }

    console.log("------------ APP ROUTER CHECKOUT SESSION END ------------")

    // Return the session URL
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe session error:", error)
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error")

    return NextResponse.json(
      {
        error: error instanceof Error ? `Stripe checkout error: ${error.message}` : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}
