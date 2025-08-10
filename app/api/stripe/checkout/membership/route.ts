import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

// Test price fallback (keeps your test product pinned during testing)
const TEST_PRICE_ID = "price_1RuLpLDheyb0pkWF5v2Psykg"

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL
  if (envUrl) {
    const hasProto = envUrl.startsWith("http://") || envUrl.startsWith("https://")
    return hasProto ? envUrl : `https://${envUrl}`
  }
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const host = req.headers.get("host")
  return `${proto}://${host}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { idToken, priceId: overridePriceId } = body || {}

    // decode minimal info from JWT without requiring Admin SDK here
    let uid = "anonymous"
    let email = ""
    let name = ""
    if (typeof idToken === "string") {
      try {
        const payloadPart = idToken.split(".")[1]
        const decoded = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8"))
        uid = decoded?.user_id || decoded?.uid || uid
        email = decoded?.email || ""
        name = decoded?.name || ""
      } catch {
        // continue; webhook will try email fallback if needed
      }
    }

    const priceId = (overridePriceId as string) || (process.env.STRIPE_PRICE_ID as string) || TEST_PRICE_ID
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
      priceId,
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
      subscription_data: { metadata },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("❌ [Membership Checkout] Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create session" }, { status: 500 })
  }
}
