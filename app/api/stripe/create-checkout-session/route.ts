import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken, videoId, pricingModel } = await request.json()

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

    // Check if video is premium
    if (videoData.type !== "premium") {
      return NextResponse.json({ error: "Video is not premium content" }, { status: 400 })
    }

    // Check if user already owns this video
    const accessDoc = await db.collection("userAccess").doc(buyerUid).collection("videos").doc(videoId).get()
    if (accessDoc.exists) {
      return NextResponse.json({ error: "You already own this video" }, { status: 400 })
    }

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(videoData.uid).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboardingComplete) {
      return NextResponse.json({ error: "Creator is not set up to receive payments" }, { status: 400 })
    }

    // Determine which pricing model to use
    const requestedPricingModel = pricingModel || creatorData.premiumPricingModel || "flat"

    // Get the price based on the pricing model
    let priceInCents
    let isSubscription = false

    if (requestedPricingModel === "subscription") {
      priceInCents = Math.round((creatorData.premiumSubscriptionPrice || 9.99) * 100)
      isSubscription = true
    } else {
      priceInCents = Math.round((creatorData.premiumFlatPrice || creatorData.premiumPrice || 4.99) * 100)
    }

    // Calculate platform fee (5%)
    const platformFee = Math.round(priceInCents * 0.05)

    // Create or get Stripe product and price
    let stripePriceId = videoData.stripePriceId
    let stripeSubscriptionPriceId = videoData.stripeSubscriptionPriceId

    // If we don't have the price ID for the requested model, create it
    if ((isSubscription && !stripeSubscriptionPriceId) || (!isSubscription && !stripePriceId)) {
      // Create Stripe product if it doesn't exist
      let productId = videoData.stripeProductId

      if (!productId) {
        const product = await stripe.products.create({
          name: videoData.title,
          description: videoData.description || `Premium video by ${videoData.username}`,
          metadata: {
            videoId: videoId,
            creatorUid: videoData.uid,
          },
        })
        productId = product.id

        // Update video with product ID
        await db.collection("videos").doc(videoId).update({
          stripeProductId: productId,
        })
      }

      // Create the appropriate price
      if (isSubscription) {
        const subscriptionPrice = await stripe.prices.create({
          unit_amount: priceInCents,
          currency: "usd",
          recurring: {
            interval: "month",
          },
          product: productId,
          metadata: {
            videoId: videoId,
            creatorUid: videoData.uid,
            type: "subscription",
          },
        })

        stripeSubscriptionPriceId = subscriptionPrice.id

        // Update video with subscription price ID
        await db.collection("videos").doc(videoId).update({
          stripeSubscriptionPriceId: stripeSubscriptionPriceId,
        })
      } else {
        const oneTimePrice = await stripe.prices.create({
          unit_amount: priceInCents,
          currency: "usd",
          product: productId,
          metadata: {
            videoId: videoId,
            creatorUid: videoData.uid,
            type: "one-time",
          },
        })

        stripePriceId = oneTimePrice.id

        // Update video with one-time price ID
        await db.collection("videos").doc(videoId).update({
          stripePriceId: stripePriceId,
        })
      }
    }

    // Use the appropriate price ID based on the model
    const priceId = isSubscription ? stripeSubscriptionPriceId : stripePriceId

    // Create Checkout session
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&video_id=${videoId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${videoData.username}`,
      metadata: {
        videoId: videoId,
        buyerUid: buyerUid,
        creatorUid: videoData.uid,
        pricingModel: isSubscription ? "subscription" : "flat",
      },
    }

    // Add application fee for one-time payments
    if (!isSubscription) {
      sessionOptions.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          videoId: videoId,
          buyerUid: buyerUid,
          creatorUid: videoData.uid,
          pricingModel: "flat",
        },
      }
    } else {
      // For subscriptions, we need to use a different approach for application fees
      // This typically involves setting up a subscription with Stripe Connect
      sessionOptions.subscription_data = {
        application_fee_percent: 5, // 5% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          videoId: videoId,
          buyerUid: buyerUid,
          creatorUid: videoData.uid,
          pricingModel: "subscription",
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionOptions)

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
