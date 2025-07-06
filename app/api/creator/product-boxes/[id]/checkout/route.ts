import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🛒 [Checkout API] Starting checkout session creation")

    const { idToken } = await request.json()
    const productBoxId = params.id

    console.log("📋 [Checkout API] Request details:", {
      productBoxId,
      hasIdToken: !!idToken,
      url: request.url,
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

    if (!userId) {
      console.error("❌ [Checkout API] User not authenticated")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get product box details
    console.log("📦 [Checkout API] Fetching product box:", productBoxId)
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

    // Check if user already owns this product box
    const existingPurchase = await db
      .collection("purchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log("⚠️ [Checkout API] User already owns this product box")
      return NextResponse.json({ error: "You already own this product box" }, { status: 400 })
    }

    // Dynamic price creation - create or retrieve Stripe price
    let priceId: string

    try {
      // Check if we already have a Stripe price ID stored
      if (productBoxData.stripePriceId) {
        console.log("💰 [Checkout API] Using existing price ID:", productBoxData.stripePriceId)
        priceId = productBoxData.stripePriceId

        // Verify the price still exists
        try {
          await stripe.prices.retrieve(priceId)
          console.log("✅ [Checkout API] Existing price validated")
        } catch (priceError) {
          console.warn("⚠️ [Checkout API] Stored price ID invalid, creating new one")
          throw new Error("Price not found")
        }
      } else {
        throw new Error("No price ID stored")
      }
    } catch (error) {
      console.log("🔄 [Checkout API] Creating new Stripe product and price")

      try {
        // Create Stripe product
        const product = await stripe.products.create({
          name: productBoxData.title || "Product Box",
          description: productBoxData.description || "Premium content",
          images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : [],
          metadata: {
            productBoxId,
            creatorId: productBoxData.creatorId,
            type: "product_box",
          },
        })

        console.log("✅ [Checkout API] Product created:", product.id)

        // Create Stripe price
        const price = await stripe.prices.create({
          currency: "usd",
          unit_amount: Math.round((productBoxData.price || 0) * 100), // Convert to cents
          product: product.id,
          metadata: {
            productBoxId,
            creatorId: productBoxData.creatorId,
            type: "product_box_price",
          },
        })

        priceId = price.id
        console.log("✅ [Checkout API] Price created:", priceId)

        // Store the price ID in Firestore for future use
        await db.collection("productBoxes").doc(productBoxId).update({
          stripeProductId: product.id,
          stripePriceId: priceId,
          updatedAt: new Date(),
        })

        console.log("💾 [Checkout API] Price ID saved to database")
      } catch (stripeError) {
        console.error("❌ [Checkout API] Failed to create Stripe product/price:", stripeError)
        return NextResponse.json(
          {
            error: "Failed to create payment configuration",
            details: stripeError instanceof Error ? stripeError.message : "Unknown error",
          },
          { status: 500 },
        )
      }
    }

    // Get site URL for redirects
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    if (!siteUrl) {
      console.error("❌ [Checkout API] No site URL configured")
      return NextResponse.json({ error: "Site configuration error" }, { status: 500 })
    }

    // Create checkout session with dynamic price
    console.log("🔄 [Checkout API] Creating checkout session with price:", priceId)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/product-box/${productBoxId}`,
      metadata: {
        productBoxId,
        buyerUid: userId,
        creatorUid: productBoxData.creatorId,
        type: "product_box_purchase",
        priceId,
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
      priceId,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: session.expires_at,
      priceId,
      amount: session.amount_total,
      currency: session.currency,
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
