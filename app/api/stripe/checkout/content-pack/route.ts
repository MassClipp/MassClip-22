import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  throw new Error("Missing Stripe API key. Set STRIPE_SECRET_KEY environment variable.")
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-06-20",
})

const CONTENT_PACK_PRICE_ID = "price_1SVjUUDheyb0pkWFUmBCrE4A"

export async function POST(request: NextRequest) {
  try {
    const host = request.headers.get("host")!
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const siteUrl = `${protocol}://${host}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: CONTENT_PACK_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=content_pack`,
      cancel_url: `${siteUrl}/`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Error creating content pack checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
