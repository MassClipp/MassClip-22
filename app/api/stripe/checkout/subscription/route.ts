import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

function getOrigin(req: NextRequest): string {
  const hdr = req.headers
  // Prefer explicit site URLs if provided, otherwise fall back to request origin
  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL
  if (envOrigin) {
    const withProto = envOrigin.startsWith("http") ? envOrigin : `https://${envOrigin}`
    return withProto.replace(/\/+$/, "")
  }
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(req: NextRequest) {
  try {
    const { idToken, uid, successUrl, cancelUrl } = await req.json().catch(() => ({}) as any)

    // We need a user id to tie the membership to an app user.
    // For now we accept uid from the client; you can add a verification step to check idToken matches uid.
    const buyerUid = typeof uid === "string" && uid.length > 0 ? uid : undefined
    if (!buyerUid) {
      return NextResponse.json({ error: "Missing uid (user not signed in)" }, { status: 401 })
    }

    const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST
    const priceId = process.env.STRIPE_PRICE_ID
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 500 })
    }
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID is not configured" }, { status: 500 })
    }

    const stripeClient = new Stripe(secretKey, {
      // Let Stripe use the default account API version configured on your account.
    } as Stripe.StripeConfig)

    const origin = getOrigin(req)
    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: buyerUid,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: successUrl || `${origin}/subscription/success`,
      cancel_url: cancelUrl || `${origin}/dashboard/membership`,
      // Put buyerUid on both the session and the subscription so your webhook can read it in multiple events
      metadata: {
        buyerUid,
        plan: "creator_pro",
        source: "membership",
      },
      subscription_data: {
        metadata: {
          buyerUid,
          plan: "creator_pro",
          source: "membership",
        },
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error("[stripe] create subscription session failed:", err)
    return NextResponse.json({ error: err?.message || "Failed to create session" }, { status: 500 })
  }
}
