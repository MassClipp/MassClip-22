import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import Stripe from "stripe"

if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const auth = getAuth()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { idToken, priceId: priceIdBody, successUrl, cancelUrl } = body || {}

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 })
    }

    let uid = "anonymous"
    let email = ""
    let displayName = ""

    try {
      const decoded = await auth.verifyIdToken(idToken)
      uid = decoded.uid
      email = decoded.email || ""
      displayName = decoded.name || email?.split("@")[0] || ""
    } catch (err) {
      console.error("❌ [Membership Checkout] Invalid idToken:", err)
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }

    const priceId = (priceIdBody || process.env.STRIPE_PRICE_ID) as string
    if (!priceId) {
      return NextResponse.json({ error: "Missing Stripe price ID" }, { status: 400 })
    }

    const host = request.headers.get("host")
    const proto = request.headers.get("x-forwarded-proto") || "https"
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`

    const metadata = {
      buyerUid: uid,
      buyerEmail: email,
      buyerName: displayName,
      plan: "creator_pro",
      contentType: "membership",
      timestamp: new Date().toISOString(),
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${baseUrl}/dashboard/membership?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/dashboard/membership?status=cancel`,
      client_reference_id: uid,
      customer_email: email || undefined,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    })

    console.log("✅ [Membership Checkout] Session created:", session.id)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("❌ [Membership Checkout] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create membership checkout session" },
      { status: 500 },
    )
  }
}
