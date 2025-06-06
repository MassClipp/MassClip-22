import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const productBoxId = params.id
    const { successUrl, cancelUrl } = await request.json()

    console.log(`🛒 [Checkout] Creating session for product box: ${productBoxId}, user: ${userId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists()) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!

    // Verify product box is active
    if (!productBox.active) {
      return NextResponse.json({ error: "Product box is not available" }, { status: 400 })
    }

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists()) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Creator's payment account not configured" }, { status: 400 })
    }

    // Get buyer user data
    const buyerDoc = await db.collection("users").doc(userId).get()
    const buyerData = buyerDoc.exists() ? buyerDoc.data() : null

    // Check if user has already purchased this product box
    const existingPurchase = await db
      .collection("purchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      return NextResponse.json({ error: "You have already purchased this content" }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: productBox.currency || "usd",
              product_data: {
                name: productBox.title,
                description: productBox.description || "Premium content package",
                images: productBox.coverImage ? [productBox.coverImage] : [],
              },
              unit_amount: Math.round(productBox.price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: productBox.type === "subscription" ? "subscription" : "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: buyerData?.email || decodedToken.email,
        metadata: {
          productBoxId,
          creatorId: productBox.creatorId,
          buyerUid: userId,
          type: "product_box_purchase",
        },
        payment_intent_data:
          productBox.type !== "subscription"
            ? {
                application_fee_amount: Math.round(productBox.price * 100 * 0.1), // 10% platform fee
                transfer_data: {
                  destination: stripeAccountId,
                },
              }
            : undefined,
        subscription_data:
          productBox.type === "subscription"
            ? {
                application_fee_percent: 10, // 10% platform fee for subscriptions
                transfer_data: {
                  destination: stripeAccountId,
                },
              }
            : undefined,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log(`✅ [Checkout] Created session: ${session.id}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("❌ [Checkout] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
