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
      success_url: `${siteUrl}/content-pack/success`,
      cancel_url: `${siteUrl}/`,
      metadata: {
        contentType: "content_pack",
        productName: "150+ High Quality Motivational Clips",
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("❌ [Content Pack Checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}
