import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🛒 [Stripe Checkout] Starting generic checkout session creation")

    const body = await request.json()
    const { productBoxId, buyerUid, successUrl, cancelUrl, amount, productName, productDescription, productImage } =
      body

    console.log("📋 [Stripe Checkout] Request body:", {
      hasProductBoxId: !!productBoxId,
      hasBuyerUid: !!buyerUid,
      hasAmount: !!amount,
      hasProductName: !!productName,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
    })

    // Validate required fields
    if (!buyerUid) {
      console.error("❌ [Stripe Checkout] Missing buyer UID")
      return NextResponse.json({ error: "Buyer UID is required" }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      console.error("❌ [Stripe Checkout] Invalid amount:", amount)
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
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
        console.log("👤 [Stripe Checkout] Buyer details found")
      }
    } catch (buyerError) {
      console.warn("⚠️ [Stripe Checkout] Could not fetch buyer details:", buyerError)
    }

    // Get product box details if provided
    let productBoxData = null
    let creatorUid = null
    if (productBoxId) {
      try {
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (productBoxDoc.exists) {
          productBoxData = productBoxDoc.data()!
          creatorUid = productBoxData.creatorId
          console.log("📦 [Stripe Checkout] Product box details loaded")
        }
      } catch (productBoxError) {
        console.warn("⚠️ [Stripe Checkout] Could not fetch product box details:", productBoxError)
      }
    }

    // Prepare session metadata
    const metadata: Record<string, string> = {
      buyerUid,
      type: productBoxId ? "product_box" : "generic",
      timestamp: new Date().toISOString(),
    }

    if (productBoxId) {
      metadata.productBoxId = productBoxId
    }
    if (creatorUid) {
      metadata.creatorUid = creatorUid
    }

    // Create Stripe checkout session
    const sessionData = {
      payment_method_types: ["card"] as const,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName || productBoxData?.title || "Digital Product",
              description: productDescription || productBoxData?.description || "Digital content",
              images:
                productImage || productBoxData?.thumbnailUrl ? [productImage || productBoxData?.thumbnailUrl] : [],
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      customer_email: customerEmail || undefined,
      metadata,
    }

    console.log("🔧 [Stripe Checkout] Creating session with configuration:", {
      amount: sessionData.line_items[0].price_data.unit_amount,
      currency: sessionData.line_items[0].price_data.currency,
      productName: sessionData.line_items[0].price_data.product_data.name,
      hasCustomerEmail: !!sessionData.customer_email,
      metadataKeys: Object.keys(sessionData.metadata),
    })

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log("✅ [Stripe Checkout] Session created successfully:", {
      sessionId: session.id,
      sessionType: session.id.startsWith("cs_test_") ? "test" : "live",
      amount: session.amount_total,
      currency: session.currency,
      url: session.url,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount: amount,
      currency: "usd",
      productTitle: productName || productBoxData?.title || "Digital Product",
    })
  } catch (error) {
    console.error("❌ [Stripe Checkout] Error creating checkout session:", {
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
