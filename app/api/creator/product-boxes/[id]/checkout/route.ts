import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🛒 [Checkout API] Starting checkout session creation")

    const { idToken } = await request.json()
    const productBoxId = params.id

    console.log("📋 [Checkout API] Request details:", {
      productBoxId,
      hasIdToken: !!idToken,
    })

    if (!productBoxId) {
      console.error("❌ [Checkout API] Missing product box ID")
      return NextResponse.json({ error: "Missing product box ID" }, { status: 400 })
    }

    // Verify user authentication
    let userId: string | null = null
    let userEmail: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email || null
        console.log("✅ [Checkout API] User authenticated:", {
          userId,
          userEmail,
        })
      } catch (error) {
        console.error("❌ [Checkout API] Auth failed:", error)
        return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
      }
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Checkout API] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log("📦 [Checkout API] Product box found:", {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
    })

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error("❌ [Checkout API] Missing Stripe key")
      return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 })
    }

    console.log("🔑 [Checkout API] Stripe config:", {
      keyType: stripeKey.startsWith("sk_test_") ? "test" : "live",
      hasKey: !!stripeKey,
    })

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData.title || "Product Box",
              description: productBoxData.description || "Premium content",
              images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : [],
            },
            unit_amount: Math.round((productBoxData.price || 0) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      metadata: {
        productBoxId,
        buyerUid: userId || "anonymous",
        creatorUid: productBoxData.creatorId,
        type: "product_box_purchase",
      },
      customer_email: userEmail || undefined,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    })

    console.log("✅ [Checkout API] Stripe session created:", {
      sessionId: session.id,
      url: session.url,
      amount: session.amount_total,
      currency: session.currency,
      expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
      metadata: session.metadata,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: session.expires_at,
    })
  } catch (error) {
    console.error("❌ [Checkout API] Error creating checkout session:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
