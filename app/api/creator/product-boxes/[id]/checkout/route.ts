import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id
    const { successUrl, cancelUrl } = await request.json()

    console.log("🛒 [Product Box Checkout] Starting checkout for:", {
      productBoxId,
      successUrl,
      cancelUrl,
    })

    // Get the product box document
    const productBoxDoc = await getDoc(doc(db, "productBoxes", productBoxId))

    if (!productBoxDoc.exists()) {
      console.error("❌ [Product Box Checkout] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    const creatorId = productBoxData.creatorId

    console.log("✅ [Product Box Checkout] Product box found:", {
      productBoxId,
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId,
    })

    // Get creator's Stripe account ID
    const creatorDoc = await getDoc(doc(db, "users", creatorId))
    if (!creatorDoc.exists()) {
      console.error("❌ [Product Box Checkout] Creator not found:", creatorId)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      console.error("❌ [Product Box Checkout] Creator's Stripe account not connected:", creatorId)
      return NextResponse.json({ error: "Creator's Stripe account not connected" }, { status: 400 })
    }

    // Get or create Stripe price
    let priceId = productBoxData.stripePriceId
    const price = productBoxData.price || 999 // Default to $9.99

    if (!priceId) {
      console.log("🏗️ [Product Box Checkout] Creating Stripe product and price")

      // Create product
      const product = await stripe.products.create({
        name: productBoxData.title || "Product Box",
        description: productBoxData.description || `Product box by ${creatorData.username}`,
        metadata: {
          productBoxId,
          creatorId,
          type: "product_box",
        },
      })

      // Create price
      const priceObj = await stripe.prices.create({
        product: product.id,
        unit_amount: price,
        currency: "usd",
      })

      priceId = priceObj.id

      // Update product box with Stripe IDs
      await doc(db, "productBoxes", productBoxId).update({
        stripeProductId: product.id,
        stripePriceId: priceId,
      })

      console.log("✅ [Product Box Checkout] Created Stripe product:", {
        productId: product.id,
        priceId,
      })
    }

    // Calculate 25% platform fee
    const applicationFee = Math.round(price * 0.25)

    console.log("💰 [Product Box Checkout] Fee calculation:", {
      price,
      applicationFee,
      creatorAmount: price - applicationFee,
    })

    // Create checkout session - FORCE live mode
    const sessionData = {
      mode: "payment" as const,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
      metadata: {
        product_box_id: productBoxId,
        creator_id: creatorId,
        checkout_type: "product_box",
      },
      payment_intent_data: {
        application_fee_amount: applicationFee,
        metadata: {
          product_box_id: productBoxId,
          creator_id: creatorId,
          platformFeeAmount: applicationFee.toString(),
          creatorAmount: (price - applicationFee).toString(),
          checkout_type: "product_box",
        },
      },
    }

    console.log("🔄 [Product Box Checkout] Creating Stripe session")

    const session = await stripe.checkout.sessions.create(sessionData, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Product Box Checkout] Session created:", {
      sessionId: session.id,
      url: session.url ? "Generated" : "Missing",
    })

    // Verify session was created with live keys
    if (session.id.startsWith("cs_test_")) {
      console.error("❌ [Product Box Checkout] ERROR: Created test session when live was expected!")
      console.error("❌ [Product Box Checkout] Session ID:", session.id)
    } else if (session.id.startsWith("cs_live_")) {
      console.log("🎉 [Product Box Checkout] SUCCESS: Created live session as expected!")
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("❌ [Product Box Checkout] Error creating checkout session:", error)

    if (error instanceof Error) {
      console.error("❌ [Product Box Checkout] Error details:", {
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 3),
      })
    }

    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
