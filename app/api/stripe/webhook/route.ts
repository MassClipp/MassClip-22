import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Get the webhook secret from environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body
    const body = await request.text()

    // Get the Stripe signature from the headers
    const signature = request.headers.get("stripe-signature")!

    // Verify the webhook signature
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle different event types
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentSucceeded(paymentIntent)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error handling webhook:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

// Handle account.updated event - keeps Stripe status synced
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Get the Firebase UID from the account metadata
    const firebaseUid = account.metadata?.firebaseUid

    if (!firebaseUid) {
      console.log("No Firebase UID in account metadata:", account.id)
      return
    }

    // Check account status
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false
    const detailsSubmitted = account.details_submitted || false
    const isFullyOnboarded = chargesEnabled && payoutsEnabled && detailsSubmitted

    // Update the user's Stripe status in Firestore
    await db
      .collection("users")
      .doc(firebaseUid)
      .update({
        stripeAccountId: account.id,
        chargesEnabled,
        payoutsEnabled,
        stripeOnboardingComplete: isFullyOnboarded,
        stripeStatusLastChecked: new Date(),
        stripeRequirements: account.requirements?.currently_due || [],
      })

    console.log(`Updated Stripe status for user ${firebaseUid}:`, {
      chargesEnabled,
      payoutsEnabled,
      isFullyOnboarded,
    })
  } catch (error) {
    console.error("Error handling account.updated:", error)
  }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Get the metadata from the session
    const { videoId, buyerUid, creatorUid } = session.metadata!

    if (!videoId || !buyerUid || !creatorUid) {
      console.error("Missing metadata in checkout session:", session.id)
      return
    }

    // Grant access to the video for the buyer
    await db
      .collection("userAccess")
      .doc(buyerUid)
      .collection("videos")
      .doc(videoId)
      .set({
        purchasedAt: new Date(),
        sessionId: session.id,
        amount: session.amount_total! / 100, // Convert from cents to dollars
        creatorUid,
      })

    // Record the sale for the creator
    await db
      .collection("users")
      .doc(creatorUid)
      .collection("sales")
      .add({
        videoId,
        buyerUid,
        sessionId: session.id,
        amount: session.amount_total! / 100, // Convert from cents to dollars
        platformFee: Math.floor(session.amount_total! * 0.05) / 100, // 5% platform fee
        netAmount: (session.amount_total! - Math.floor(session.amount_total! * 0.05)) / 100, // Net amount after platform fee
        purchasedAt: new Date(),
        status: "completed",
      })

    // Update video stats
    await db
      .collection("videos")
      .doc(videoId)
      .update({
        purchaseCount: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total! / 100),
      })

    console.log(`Successfully processed payment for video ${videoId} by user ${buyerUid}`)
  } catch (error) {
    console.error("Error handling checkout.session.completed:", error)
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Get the metadata from the payment intent
    const { videoId, buyerUid, creatorUid } = paymentIntent.metadata

    if (!videoId || !buyerUid || !creatorUid) {
      console.log("No video metadata in payment intent:", paymentIntent.id)
      return
    }

    // Update the payment status in Firestore
    await db
      .collection("users")
      .doc(creatorUid)
      .collection("sales")
      .where("sessionId", "==", paymentIntent.metadata.sessionId)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          doc.ref.update({
            paymentIntentId: paymentIntent.id,
            paymentStatus: "succeeded",
          })
        })
      })

    console.log(`Payment succeeded for video ${videoId}`)
  } catch (error) {
    console.error("Error handling payment_intent.succeeded:", error)
  }
}
