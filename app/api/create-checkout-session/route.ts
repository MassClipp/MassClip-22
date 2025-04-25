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

    console.log(`Creating checkout session for email: ${customerEmail}`)
    console.log("Using price ID:", process.env.STRIPE_PRICE_ID)
    console.log("Success URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success`)
    console.log("Cancel URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel`)

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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel`,
      customer_email: customerEmail,
      metadata: {
        email: customerEmail,
        firebaseUid: userId || "", // Renamed from userId to firebaseUid for clarity
        plan: "pro", // Add plan type for tracking
      },
    }

    console.log(`Including firebaseUid in metadata: ${userId || "not-provided"}`)
    console.log(`Including plan type in metadata: pro`)

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log("Session created with ID:", session.id)
    console.log("Session URL:", session.url)
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
