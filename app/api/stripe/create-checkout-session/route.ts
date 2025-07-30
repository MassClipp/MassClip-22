import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productBoxId, successUrl, cancelUrl } = body

    console.log("🛒 [Checkout] Creating checkout session for product box:", productBoxId)

    // Get authenticated user
    const headers = Object.fromEntries(request.headers.entries())
    const user = await getAuthenticatedUser(headers)
    console.log("✅ [Checkout] Authenticated user:", user.uid)

    // Get product box details
    const productBoxDoc = await adminDb.collection("product_boxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Checkout] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    console.log("📦 [Checkout] Product box details:", {
      title: productBox.title,
      price: productBox.price,
      creatorId: productBox.creatorId,
    })

    // Get creator's Stripe account
    const creatorDoc = await adminDb.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists) {
      console.error("❌ [Checkout] Creator not found:", productBox.creatorId)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creator = creatorDoc.data()!
    const stripeAccountId = creator.stripeAccountId

    if (!stripeAccountId) {
      console.error("❌ [Checkout] Creator has no Stripe account:", productBox.creatorId)
      return NextResponse.json({ error: "Creator payment not configured" }, { status: 400 })
    }

    console.log("💳 [Checkout] Using Stripe account:", stripeAccountId)

    // Calculate amounts (price is in dollars, Stripe needs cents)
    const unitAmount = Math.round(productBox.price * 100)
    const applicationFeeAmount = Math.round(unitAmount * 0.05) // 5% platform fee

    console.log("💰 [Checkout] Pricing:", {
      unitAmount,
      applicationFeeAmount,
      creatorAmount: unitAmount - applicationFeeAmount,
    })

    // Create checkout session on connected account
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: productBox.title,
                description:
                  productBox.description || `Premium content from ${creator.displayName || creator.username}`,
                images: productBox.thumbnailUrl ? [productBox.thumbnailUrl] : undefined,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url:
          successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
        client_reference_id: user.uid, // This is critical for identifying the buyer
        customer_email: user.email,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            productBoxId,
            buyerUid: user.uid, // Store buyer UID in payment intent metadata
            buyerEmail: user.email || "",
            buyerName: user.displayName || "",
            creatorId: productBox.creatorId,
            platform: "massclip",
          },
        },
        metadata: {
          productBoxId,
          buyerUid: user.uid, // Store buyer UID in session metadata
          buyerEmail: user.email || "",
          buyerName: user.displayName || "",
          creatorId: productBox.creatorId,
          platform: "massclip",
        },
      },
      {
        stripeAccount: stripeAccountId, // Create session on connected account
      },
    )

    console.log("✅ [Checkout] Session created successfully:", {
      sessionId: session.id,
      url: session.url,
      stripeAccount: stripeAccountId,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      stripeAccount: stripeAccountId,
    })
  } catch (error: any) {
    console.error("❌ [Checkout] Error creating checkout session:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
