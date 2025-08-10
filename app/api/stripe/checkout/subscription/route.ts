import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/firebase-admin"
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
    const { idToken, successUrl, cancelUrl } = await req.json()

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 })
    }

    const decoded = await auth.verifyIdToken(idToken)
    const buyerUid = decoded.uid
    const email = decoded.email || undefined

    // Use the Price ID from the environment
    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      console.error("STRIPE_PRICE_ID is not set in environment")
      return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 })
    }

    const baseUrl = getBaseUrl()

    // Create a subscription Checkout Session via API
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Attach user identity so your webhook can resolve the user
      client_reference_id: buyerUid,
      metadata: {
        buyerUid,
        plan: "creator_pro",
        source: "api_checkout_subscription",
      },
      // Help Stripe prefill customer info; webhook can persist customer id
      customer_email: email,
      allow_promotion_codes: true,
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/pricing`,
    })

    return NextResponse.json({ success: true, sessionId: session.id, url: session.url })
  } catch (err: any) {
    console.error("Error creating subscription checkout session:", err)
    return NextResponse.json({ error: "Failed to create subscription session" }, { status: 500 })
  }
}
