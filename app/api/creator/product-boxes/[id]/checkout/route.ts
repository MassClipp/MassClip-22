import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🛒 [Product Box Checkout] Starting checkout creation for product box:", params.id)

    // Verify authentication first
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Product Box Checkout] Authentication failed")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const buyerUid = decodedToken.uid
    console.log("👤 [Product Box Checkout] Authenticated buyer UID:", buyerUid)

    // Get the request body for additional parameters
    let requestBody = {}
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.log("ℹ️ [Product Box Checkout] No request body or invalid JSON, using defaults")
    }

    const { successUrl, cancelUrl } = requestBody as any

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

    // Check if user already owns this product box
    const existingPurchase = await db
      .collection("users")
      .doc(buyerUid)
      .collection("purchases")
      .where("productBoxId", "==", params.id)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log("ℹ️ [Product Box Checkout] User already owns this product box")
      return NextResponse.json({ error: "You already own this product" }, { status: 400 })
    }

    // Get buyer details for customer info
    let customerEmail = null
    let customerName = null
    try {
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (buyerDoc.exists) {
        const buyerData = buyerDoc.data()
        customerEmail = buyerData?.email || decodedToken.email
        customerName = buyerData?.displayName || buyerData?.name || decodedToken.name
      }
    } catch (buyerError) {
      console.warn("⚠️ [Product Box Checkout] Could not fetch buyer details:", buyerError)
      // Fallback to token data
      customerEmail = decodedToken.email
      customerName = decodedToken.name
    }

    console.log("👤 [Product Box Checkout] Customer info:", {
      hasEmail: !!customerEmail,
      hasName: !!customerName,
    })

    // Create Stripe checkout session
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
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${params.id}`,
      customer_email: customerEmail || undefined,
      metadata: {
        productBoxId: params.id,
        buyerUid,
        creatorUid: productBoxData.creatorId,
        type: "product_box",
        timestamp: new Date().toISOString(),
      },
    }

    console.log("🔧 [Product Box Checkout] Creating session with data:", {
      amount: sessionData.line_items[0].price_data.unit_amount,
      currency: sessionData.line_items[0].price_data.currency,
      hasCustomerEmail: !!sessionData.customer_email,
      metadataKeys: Object.keys(sessionData.metadata),
    })

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log("✅ [Product Box Checkout] Stripe session created successfully:", {
      sessionId: session.id,
      sessionType: session.id.startsWith("cs_test_") ? "test" : "live",
      amount: session.amount_total,
      currency: session.currency,
      url: session.url,
    })

    return NextResponse.json({
      success: true,
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 [Product Box Checkout] GET request for product box:", params.id)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get product box data
    const productBoxDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()

    return NextResponse.json({
      success: true,
      productBox: {
        id: params.id,
        title: productBoxData?.title,
        description: productBoxData?.description,
        price: productBoxData?.price,
        currency: "usd",
        active: productBoxData?.active !== false,
        creatorId: productBoxData?.creatorId,
        thumbnailUrl: productBoxData?.thumbnailUrl,
      },
    })
  } catch (error) {
    console.error("❌ [Product Box Checkout] GET error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
