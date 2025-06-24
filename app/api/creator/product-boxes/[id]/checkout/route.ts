import { type NextRequest, NextResponse } from "next/server"
import { db, verifyIdToken } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🛒 [Checkout] Starting checkout process for product box: ${params.id}`)

    // Get the authorization header
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Checkout] No authorization header provided")
      return new NextResponse("Unauthorized - No token provided", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await verifyIdToken(token)
    } catch (error) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return new NextResponse("Unauthorized - Invalid token", { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔑 [Checkout] Authenticated user: ${userId}`)

    const { id } = params
    let body
    try {
      body = await req.json()
    } catch (error) {
      console.error("❌ [Checkout] Failed to parse request body:", error)
      return new NextResponse("Invalid request body", { status: 400 })
    }

    const { successUrl, cancelUrl } = body

    // Get product box from Firestore
    console.log(`📦 [Checkout] Fetching product box: ${id}`)
    const productBoxDoc = await db.collection("productBoxes").doc(id).get()

    if (!productBoxDoc.exists) {
      console.error(`❌ [Checkout] Product box not found: ${id}`)
      return new NextResponse("Product box not found", { status: 404 })
    }

    const productBox = productBoxDoc.data()
    if (!productBox) {
      console.error(`❌ [Checkout] Product box data is null: ${id}`)
      return new NextResponse("Product box data is invalid", { status: 400 })
    }

    if (!productBox.active) {
      console.error(`❌ [Checkout] Product box is not active: ${id}`)
      return new NextResponse("Product box is not active", { status: 400 })
    }

    console.log(`✅ [Checkout] Product box found: ${productBox.title}, Price: $${productBox.price / 100}`)

    // Get creator data
    console.log(`👤 [Checkout] Fetching creator: ${productBox.creatorId}`)
    const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`❌ [Checkout] Creator not found: ${productBox.creatorId}`)
      return new NextResponse("Creator not found", { status: 404 })
    }

    const creatorData = creatorDoc.data()
    if (!creatorData) {
      console.error(`❌ [Checkout] Creator data is null: ${productBox.creatorId}`)
      return new NextResponse("Creator data is invalid", { status: 400 })
    }

    if (!creatorData.stripeAccountId) {
      console.error(`❌ [Checkout] Creator has no Stripe account: ${productBox.creatorId}`)
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    console.log(`✅ [Checkout] Creator found: ${creatorData.username || creatorData.displayName}`)

    // Calculate 25% platform fee
    const applicationFee = Math.round(productBox.price * 0.25)

    console.log(
      `💰 [Checkout] Price: $${productBox.price / 100}, Platform fee: $${applicationFee / 100}, Creator gets: $${(productBox.price - applicationFee) / 100}`,
    )

    // Create Stripe checkout session
    console.log(`🔄 [Checkout] Creating Stripe session...`)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title,
              description:
                productBox.description || `Product box by ${creatorData.username || creatorData.displayName}`,
            },
            unit_amount: productBox.price,
          },
          quantity: 1,
        },
      ],
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${id}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
      payment_intent_data: {
        application_fee_amount: applicationFee, // 25% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          productBoxId: id,
          buyerUid: userId,
          creatorUid: productBox.creatorId,
          platformFeeAmount: applicationFee.toString(),
          creatorAmount: (productBox.price - applicationFee).toString(),
        },
      },
      metadata: {
        productBoxId: id,
        buyerUid: userId,
        creatorUid: productBox.creatorId,
        type: "product_box_purchase",
      },
    })

    console.log(`✅ [Checkout] Created session: ${session.id}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("[PRODUCT_BOX_CHECKOUT] Error:", error)

    // More detailed error logging
    if (error instanceof Error) {
      console.error("[PRODUCT_BOX_CHECKOUT] Error message:", error.message)
      console.error("[PRODUCT_BOX_CHECKOUT] Error stack:", error.stack)
    }

    return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}
