import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🛒 [Create Checkout Session] Starting checkout session creation")

    const { productBoxId, buyerUid, successUrl, cancelUrl } = await request.json()

    if (!productBoxId || !buyerUid) {
      console.error("❌ [Create Checkout Session] Missing required fields:", {
        hasProductBoxId: !!productBoxId,
        hasBuyerUid: !!buyerUid,
      })
      return NextResponse.json({ error: "Product box ID and buyer UID are required" }, { status: 400 })
    }

    console.log("📋 [Create Checkout Session] Request details:", {
      productBoxId,
      buyerUid,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
    })

    // Get the product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      console.error("❌ [Create Checkout Session] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log("📦 [Create Checkout Session] Product box details:", {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
      hasDescription: !!productBoxData.description,
      hasThumbnail: !!productBoxData.thumbnailUrl,
    })

    // Validate price
    if (!productBoxData.price || productBoxData.price <= 0) {
      console.error("❌ [Create Checkout Session] Invalid price:", productBoxData.price)
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
        console.log("👤 [Create Checkout Session] Buyer details:", {
          hasEmail: !!customerEmail,
          hasName: !!customerName,
        })
      }
    } catch (buyerError) {
      console.warn("⚠️ [Create Checkout Session] Could not fetch buyer details:", buyerError)
    }

    // Prepare checkout session data
    const sessionData = {
      payment_method_types: ["card"] as const,
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
      mode: "payment" as const,
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      customer_email: customerEmail || undefined,
      metadata: {
        productBoxId,
        buyerUid,
        creatorUid: productBoxData.creatorId,
        type: "product_box",
        timestamp: new Date().toISOString(),
      },
    }

    console.log("🔧 [Create Checkout Session] Session configuration:", {
      amount: sessionData.line_items[0].price_data.unit_amount,
      currency: sessionData.line_items[0].price_data.currency,
      hasCustomerEmail: !!sessionData.customer_email,
      metadataKeys: Object.keys(sessionData.metadata),
    })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionData)

    console.log("✅ [Create Checkout Session] Stripe session created successfully:", {
      sessionId: session.id,
      sessionType: session.id.startsWith("cs_test_") ? "test" : "live",
      amount: session.amount_total,
      currency: session.currency,
      url: session.url,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount: productBoxData.price,
      currency: "usd",
      productTitle: productBoxData.title,
      expiresAt: session.expires_at,
    })
  } catch (error) {
    console.error("❌ [Create Checkout Session] Error creating checkout session:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
    })

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        errorType: error instanceof Error ? error.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
