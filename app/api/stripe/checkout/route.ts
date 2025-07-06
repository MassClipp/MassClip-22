import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🛒 [Stripe Checkout] Starting checkout process")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Stripe Checkout] Authentication failed")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("👤 [Stripe Checkout] Authenticated user:", userId)

    const { productBoxId, priceId, successUrl, cancelUrl } = await request.json()

    if (!productBoxId) {
      console.error("❌ [Stripe Checkout] Missing product box ID")
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log("📋 [Stripe Checkout] Request details:", {
      productBoxId,
      priceId,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
    })

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      console.error("❌ [Stripe Checkout] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log("📦 [Stripe Checkout] Product box found:", {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
    })

    // Check if user already owns this product
    const existingPurchase = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", productBoxId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log("ℹ️ [Stripe Checkout] User already owns this product")
      return NextResponse.json({ error: "You already own this product" }, { status: 400 })
    }

    // Get user details for customer info
    let customerEmail = decodedToken.email
    let customerName = decodedToken.name

    try {
      const userDoc = await db.collection("users").doc(userId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        customerEmail = userData?.email || customerEmail
        customerName = userData?.displayName || userData?.name || customerName
      }
    } catch (userError) {
      console.warn("⚠️ [Stripe Checkout] Could not fetch user details:", userError)
    }

    // Create checkout session
    const sessionData: any = {
      payment_method_types: ["card"],
      mode: "payment",
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      customer_email: customerEmail || undefined,
      metadata: {
        productBoxId,
        buyerUid: userId,
        creatorUid: productBoxData.creatorId,
        type: "product_box_checkout",
      },
    }

    // Use price ID if provided, otherwise create price data
    if (priceId) {
      sessionData.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
      console.log("💰 [Stripe Checkout] Using existing price ID:", priceId)
    } else {
      // Validate price
      if (!productBoxData.price || productBoxData.price <= 0) {
        console.error("❌ [Stripe Checkout] Invalid price:", productBoxData.price)
        return NextResponse.json({ error: "Invalid product price" }, { status: 400 })
      }

      sessionData.line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData.title || "Product Box",
              description: productBoxData.description || "Digital content package",
              images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : [],
            },
            unit_amount: Math.round(productBoxData.price * 100),
          },
          quantity: 1,
        },
      ]
      console.log("💰 [Stripe Checkout] Creating price data for amount:", productBoxData.price)
    }

    console.log("🔧 [Stripe Checkout] Creating session with configuration:", {
      hasCustomerEmail: !!sessionData.customer_email,
      metadataKeys: Object.keys(sessionData.metadata),
      lineItemsCount: sessionData.line_items.length,
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
      success: true,
      sessionId: session.id,
      url: session.url,
      amount: session.amount_total ? session.amount_total / 100 : productBoxData.price,
      currency: session.currency || "usd",
      productTitle: productBoxData.title,
    })
  } catch (error) {
    console.error("❌ [Stripe Checkout] Error creating session:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
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
