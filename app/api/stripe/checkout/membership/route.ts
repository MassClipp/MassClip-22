import { NextResponse, type NextRequest } from "next/server"
import Stripe from "stripe"

// Use live or test secret depending on env config
const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST || ""

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20",
})

function getBaseUrl(req: NextRequest) {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL
  if (fromEnv) {
    const hasProto = fromEnv.startsWith("http://") || fromEnv.startsWith("https://")
    return hasProto ? fromEnv : `https://${fromEnv}`
  }
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const host = req.headers.get("host")
  return `${proto}://${host}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}) as any)
    const { idToken, priceId: overridePriceId } = body || {}

    if (!stripeSecret) {
      return NextResponse.json({ error: "Stripe secret not configured" }, { status: 500 })
    }

    if (!idToken) {
      // We still allow fallback via Payment Link on the client if this fails
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 })
    }

    // We don’t strictly require Firebase Admin here in this route to keep it portable in this environment.
    // Instead, we accept the idToken, pass user context to Stripe via metadata and client_reference_id
    // derived from the token itself (lightweight decode of JWT payload).
    let uid = "anonymous"
    let email = ""
    let name = ""

    try {
      const payloadPart = idToken.split(".")[1]
      const decoded = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8"))
      uid = decoded?.user_id || decoded?.uid || uid
      email = decoded?.email || ""
      name = decoded?.name || ""
    } catch {
      // If decoding fails, we proceed; webhook will try to recover via email.
    }

    const priceId = (overridePriceId || process.env.STRIPE_PRICE_ID) as string
    if (!priceId) {
      return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 400 })
    }

    const baseUrl = getBaseUrl(req)
    const metadata = {
      buyerUid: uid,
      buyerEmail: email,
      buyerName: name || (email ? email.split("@")[0] : ""),
      plan: "creator_pro",
      contentType: "membership",
      source: "dashboard_membership",
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/membership?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/membership?status=cancel`,
      client_reference_id: uid,
      customer_email: email || undefined,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error("Membership checkout create error:", err)
    return NextResponse.json({ error: err?.message || "Failed to create session" }, { status: 500 })
  }
}
