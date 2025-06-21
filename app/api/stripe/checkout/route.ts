import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get the request data
    const { idToken, videoId } = await request.json()

    if (!idToken || !videoId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const buyerUid = decodedToken.uid

    // Get the video document from Firestore
    const videoDoc = await db.collection("videos").doc(videoId).get()

    if (!videoDoc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const videoData = videoDoc.data()!

    // Check if the video is premium
    if (!videoData.isPremium) {
      return NextResponse.json({ error: "Video is not premium" }, { status: 400 })
    }

    // Check if the user already has access to this video
    const accessDoc = await db.collection("userAccess").doc(buyerUid).collection("videos").doc(videoId).get()

    if (accessDoc.exists) {
      return NextResponse.json({ error: "You already have access to this video" }, { status: 400 })
    }

    // Get the creator's user document to get their Stripe account ID
    const creatorDoc = await db.collection("users").doc(videoData.uid).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId || !creatorData.stripeOnboarded) {
      return NextResponse.json({ error: "Creator is not set up to receive payments" }, { status: 400 })
    }

    // Get the price from the video document (stored in cents, e.g. 499 for $4.99)
    const price = videoData.price || 499 // Default to $4.99 if not set

    // Calculate the application fee (25% of the price)
    const applicationFee = Math.round(price * 0.25)

    // Create a product for the video if it doesn't exist
    let productId = videoData.stripeProductId
    let priceId = videoData.stripePriceId

    if (!productId) {
      // Create a new product
      const product = await stripe.products.create({
        name: videoData.title || "Premium Video",
        description: videoData.description || `Premium video by ${videoData.username}`,
        metadata: {
          videoId,
          creatorUid: videoData.uid,
        },
      })

      productId = product.id

      // Create a price for the product
      const priceObj = await stripe.prices.create({
        product: productId,
        unit_amount: price,
        currency: "usd",
      })

      priceId = priceObj.id

      // Update the video document with the Stripe product and price IDs
      await db.collection("videos").doc(videoId).update({
        stripeProductId: productId,
        stripePriceId: priceId,
      })
    }

    // Create a Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&video_id=${videoId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${videoData.username}`,
      payment_intent_data: {
        application_fee_amount: applicationFee, // 25% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          videoId,
          buyerUid,
          creatorUid: videoData.uid,
          platformFeeAmount: applicationFee.toString(),
          creatorAmount: (price - applicationFee).toString(),
        },
      },
      metadata: {
        videoId,
        buyerUid,
        creatorUid: videoData.uid,
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
