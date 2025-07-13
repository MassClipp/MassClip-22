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
      priceId,
    } = await request.json()

    console.log("🛒 [Stripe Checkout] Creating session:", { productBoxId, amount, buyerUid, creatorId })

    // HARDCODED URLs - NO DYNAMIC GENERATION
    const baseUrl = "https://v0-massclip1-git-preview-massclippp-gmailcoms-projects.vercel.app"
    const successUrl = `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBoxId}`
    const cancelUrl = `${baseUrl}/product-box/${productBoxId}`

    console.log("🔗 [Stripe Checkout] Using hardcoded URLs:", { successUrl, cancelUrl })

    let lineItems
    if (priceId) {
      // Use existing price
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
    } else if (amount) {
      // Create price on the fly
      lineItems = [
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
      ]
    } else {
      return NextResponse.json({ error: "Either amount or priceId is required" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productBoxId: productBoxId || "",
        buyerUid: buyerUid || "anonymous",
        creatorId: creatorId || "",
        type: "product_box_purchase",
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    })

    console.log("✅ [Stripe Checkout] Session created:", session.id)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      successUrl,
      cancelUrl,
    })
  } catch (error: any) {
    console.error("❌ [Stripe Checkout] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
