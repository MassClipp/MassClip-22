import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const {
      productBoxId,
      amount,
      currency = "usd",
      buyerUid,
      creatorId,
      productTitle,
      productDescription,
    } = await request.json()

    console.log("🛒 [Create Checkout] Creating session:", { productBoxId, amount, buyerUid, creatorId })

    if (!productBoxId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // HARDCODED URLs - NO DYNAMIC GENERATION
    const baseUrl = "https://v0-massclip1-git-preview-massclippp-gmailcoms-projects.vercel.app"
    const successUrl = `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBoxId}`
    const cancelUrl = `${baseUrl}/product-box/${productBoxId}`

    console.log("🔗 [Create Checkout] Using hardcoded URLs:", { successUrl, cancelUrl })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productTitle || `Product Box ${productBoxId}`,
              description: productDescription || "Premium content bundle",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productBoxId,
        buyerUid: buyerUid || "anonymous",
        creatorId: creatorId || "",
        type: "product_box_purchase",
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    })

    console.log("✅ [Create Checkout] Session created:", session.id)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      successUrl,
      cancelUrl,
    })
  } catch (error: any) {
    console.error("❌ [Create Checkout] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
