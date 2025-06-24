import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get the authorization header
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized - No token provided", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase ID token
    const admin = await import("firebase-admin")
    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    if (!userId) {
      return new NextResponse("Unauthorized - Invalid token", { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { successUrl, cancelUrl } = body

    console.log(`🛒 [Checkout] Processing request for product box: ${id} by user: ${userId}`)

    // Get product box from Firestore
    const productBoxDoc = await db.collection("productBoxes").doc(id).get()

    if (!productBoxDoc.exists) {
      return new NextResponse("Product box not found", { status: 404 })
    }

    const productBox = productBoxDoc.data()
    if (!productBox?.active) {
      return new NextResponse("Product box is not active", { status: 400 })
    }

    // Get creator data
    const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists) {
      return new NextResponse("Creator not found", { status: 404 })
    }

    const creatorData = creatorDoc.data()
    if (!creatorData?.stripeAccountId) {
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    // Calculate 25% platform fee
    const applicationFee = Math.round(productBox.price * 0.25)

    console.log(
      `💰 [Checkout] Price: $${productBox.price / 100}, Platform fee: $${applicationFee / 100}, Creator gets: $${(productBox.price - applicationFee) / 100}`,
    )

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
    return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}
