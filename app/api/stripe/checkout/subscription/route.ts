import { NextResponse, type NextRequest } from "next/server"
import { stripe } from "@/lib/stripe"

function getBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL_2 ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "")
  return fromEnv || "http://localhost:3000"
}

export async function POST(req: NextRequest) {
  try {
    const { buyerUid, successUrl, cancelUrl } = await req.json()

    if (!buyerUid || typeof buyerUid !== "string") {
      return NextResponse.json({ error: "Missing buyerUid" }, { status: 400 })
    }

    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      console.error("[stripe] STRIPE_PRICE_ID is not set")
      return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 })
    }

    const baseUrl = getBaseUrl()

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: buyerUid,
      metadata: {
        buyerUid,
        plan: "creator_pro",
        source: "api_checkout_subscription",
      },
      allow_promotion_codes: true,
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/pricing`,
    })

    return NextResponse.json({ success: true, sessionId: session.id, url: session.url })
  } catch (err) {
    console.error("Error creating subscription checkout session:", err)
    return NextResponse.json({ error: "Failed to create subscription session" }, { status: 500 })
  }
}
