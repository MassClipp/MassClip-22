import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken, videoId } = await request.json()

    if (!idToken || !videoId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const buyerUid = decodedToken.uid

    // Get video details
    const videoDoc = await db.collection("videos").doc(videoId).get()
    if (!videoDoc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const videoData = videoDoc.data()!

    // Check if video is premium and has a price
    if (videoData.type !== "premium" || !videoData.price) {
      return NextResponse.json({ error: "Video is not available for purchase" }, { status: 400 })
    }

    // Check if user already owns this video
    const accessDoc = await db.collection("userAccess").doc(buyerUid).collection("videos").doc(videoId).get()
    if (accessDoc.exists) {
      return NextResponse.json({ error: "You already own this video" }, { status: 400 })
    }

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(videoData.uid).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboarded) {
      return NextResponse.json({ error: "Creator is not set up to receive payments" }, { status: 400 })
    }

    // Calculate amounts (price is stored in dollars, Stripe uses cents)
    const priceInCents = Math.round(videoData.price * 100)
    const platformFee = Math.round(priceInCents * 0.05) // 5% platform fee

    // Create or get Stripe product and price
    let stripePriceId = videoData.stripePriceId

    if (!stripePriceId) {
      // Create Stripe product
      const product = await stripe.products.create({
        name: videoData.title,
        description: videoData.description || `Premium video by ${videoData.username}`,
        metadata: {
          videoId: videoId,
          creatorUid: videoData.uid,
        },
      })

      // Create Stripe price
      const price = await stripe.prices.create({
        unit_amount: priceInCents,
        currency: "usd",
        product: product.id,
        metadata: {
          videoId: videoId,
          creatorUid: videoData.uid,
        },
      })

      stripePriceId = price.id

      // Update video with Stripe IDs
      await db.collection("videos").doc(videoId).update({
        stripeProductId: product.id,
        stripePriceId: stripePriceId,
      })
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&video_id=${videoId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${videoData.username}`,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          videoId: videoId,
          buyerUid: buyerUid,
          creatorUid: videoData.uid,
        },
      },
      metadata: {
        videoId: videoId,
        buyerUid: buyerUid,
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
