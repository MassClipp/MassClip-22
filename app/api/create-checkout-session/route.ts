import { NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// Site URL for redirects
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { priceId, customerEmail } = body

    // Validate required fields
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 })
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: customerEmail || undefined,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
    })

    // Return the session ID
    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error("Checkout session error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
