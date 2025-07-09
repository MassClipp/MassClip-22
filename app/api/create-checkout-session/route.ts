import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken, productBoxId } = await request.json()

    if (!idToken || !productBoxId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const buyerUid = decodedToken.uid

    // Get the product box document from Firestore
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    // Check if the user already has access to this product box
    const accessDoc = await db.collection("userAccess").doc(buyerUid).collection("productBoxes").doc(productBoxId).get()

    if (accessDoc.exists) {
      return NextResponse.json({ error: "You already have access to this product box" }, { status: 400 })
    }

    // Get the creator's user document to get their Stripe account ID
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId || !creatorData.stripeOnboarded) {
      return NextResponse.json({ error: "Creator is not set up to receive payments" }, { status: 400 })
    }

    // Get the price from the product box document
    const price = productBoxData.price || 999 // Default to $9.99 if not set

    // Calculate the application fee (25% of the price)
    const applicationFee = Math.round(price * 0.25)

    // Create a Checkout session - UPDATED SUCCESS URL
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData.title || "Premium Product Box",
              description: productBoxData.description || `Premium content by ${productBoxData.creatorUsername}`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBoxId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${productBoxData.creatorUsername}`,
      payment_intent_data: {
        application_fee_amount: applicationFee, // 25% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          productBoxId,
          buyerUid,
          creatorUid: productBoxData.creatorId,
          platformFeeAmount: applicationFee.toString(),
          creatorAmount: (price - applicationFee).toString(),
        },
      },
      metadata: {
        productBoxId,
        buyerUid,
        creatorUid: productBoxData.creatorId,
      },
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
