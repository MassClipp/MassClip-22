import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🛒 [Product Box Checkout] Starting checkout creation for product box:", params.id)

    // Get the request body
    const { buyerUid, successUrl, cancelUrl } = await request.json()

    if (!buyerUid) {
      console.error("❌ [Product Box Checkout] Missing buyer UID")
      return NextResponse.json({ error: "Buyer UID is required" }, { status: 400 })
    }

    console.log("👤 [Product Box Checkout] Buyer UID:", buyerUid)

    // Get the product box details
    const productBoxDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!productBoxDoc.exists) {
      console.error("❌ [Product Box Checkout] Product box not found:", params.id)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log("📦 [Product Box Checkout] Product box found:", {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
    })

    // Validate price
    if (!productBoxData.price || productBoxData.price <= 0) {
      console.error("❌ [Product Box Checkout] Invalid price:", productBoxData.price)
      return NextResponse.json({ error: "Invalid product price" }, { status: 400 })
    }

    // Get buyer details for customer info
    let customerEmail = null
    let customerName = null
    try {
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (buyerDoc.exists) {
        const buyerData = buyerDoc.data()
        customerEmail = buyerData?.email
        customerName = buyerData?.displayName || buyerData?.name
      }
    } catch (buyerError) {
      console.warn("⚠️ [Product Box Checkout] Could not fetch buyer details:", buyerError)
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData.title || "Product Box",
              description: productBoxData.description || "Digital content package",
              images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : [],
            },
            unit_amount: Math.round(productBoxData.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${params.id}`,
      customer_email: customerEmail || undefined,
      metadata: {
        productBoxId: params.id,
        buyerUid,
        creatorUid: productBoxData.creatorId,
        type: "product_box",
      },
    })

    console.log("✅ [Product Box Checkout] Stripe session created:", {
      sessionId: session.id,
      sessionType: session.id.startsWith("cs_test_") ? "test" : "live",
      amount: session.amount_total,
      currency: session.currency,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount: productBoxData.price,
      currency: "usd",
      productTitle: productBoxData.title,
    })
  } catch (error) {
    console.error("❌ [Product Box Checkout] Error creating checkout session:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      productBoxId: params.id,
    })

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
