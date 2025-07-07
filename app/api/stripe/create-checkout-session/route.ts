import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken, productBoxId, price } = await request.json()

    console.log("🔍 [Checkout] Creating session for:", { productBoxId, price })

    if (!idToken || !productBoxId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const buyerUid = decodedToken.uid

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    // Check if user already owns this product box
    const existingPurchase = await db
      .collection("users")
      .doc(buyerUid)
      .collection("purchases")
      .where("productBoxId", "==", productBoxId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      return NextResponse.json({ error: "You already own this product" }, { status: 400 })
    }

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboardingComplete) {
      return NextResponse.json({ error: "Creator is not set up to receive payments" }, { status: 400 })
    }

    // Get the price from the product box or use the provided price
    const priceInCents = Math.round((price || productBoxData.price || 9.99) * 100)

    // Calculate platform fee (25%)
    const platformFee = Math.round(priceInCents * 0.25)

    console.log("💰 [Checkout] Price details:", { priceInCents, platformFee })

    // Create Stripe checkout session with EXPLICIT metadata and stripeAccount
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData.title || "Product Box",
              description: productBoxData.description || "Digital content package",
              images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : undefined,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      client_reference_id: buyerUid,
      // CRITICAL: Ensure metadata is set at the session level
      metadata: {
        productBoxId: productBoxId,
        buyerUid: buyerUid,
        creatorUid: productBoxData.creatorId,
        productTitle: productBoxData.title || "Product Box",
      },
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          productBoxId: productBoxId,
          buyerUid: buyerUid,
          creatorUid: productBoxData.creatorId,
        },
      },
    }

    console.log("📝 [Checkout] Session params metadata:", sessionParams.metadata)
    console.log("🔗 [Checkout] Using connected account:", creatorData.stripeAccountId)

    // FIXED: Create session on the connected account (not platform account)
    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: creatorData.stripeAccountId,
    })

    console.log("✅ [Checkout] Session created on connected account:", {
      id: session.id,
      metadata: session.metadata,
      url: session.url,
      stripeAccount: creatorData.stripeAccountId,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error("❌ [Checkout] Error creating session:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
