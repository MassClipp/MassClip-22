import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
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

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
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
    const { videoId, buyerUid, creatorUid, pricingModel } = session.metadata!

    if (!videoId || !buyerUid || !creatorUid) {
      console.error("Missing metadata in checkout session:", session.id)
      return
    }

    const isSubscription = pricingModel === "subscription" || session.mode === "subscription"

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
        pricingModel: isSubscription ? "subscription" : "flat",
        subscriptionId: session.subscription || null,
        expiresAt: isSubscription ? null : null, // No expiration for one-time purchases
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
        platformFee: Math.round(session.amount_total! * 0.05) / 100, // 5% platform fee
        netAmount: (session.amount_total! - Math.round(session.amount_total! * 0.05)) / 100, // Net amount after platform fee
        purchasedAt: new Date(),
        status: "completed",
        pricingModel: isSubscription ? "subscription" : "flat",
        subscriptionId: session.subscription || null,
        isRecurring: isSubscription,
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

// Handle invoice.paid event (for subscriptions)
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    // Skip if this is not a subscription invoice
    if (!invoice.subscription) return

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

    // Get metadata from the subscription
    const { videoId, buyerUid, creatorUid } = subscription.metadata

    if (!videoId || !buyerUid || !creatorUid) {
      console.log("Missing metadata in subscription:", subscription.id)
      return
    }

    // For recurring payments (not the first one, which is handled by checkout.session.completed)
    if (invoice.billing_reason === "subscription_cycle") {
      // Record the recurring payment
      await db
        .collection("users")
        .doc(creatorUid)
        .collection("sales")
        .add({
          videoId,
          buyerUid,
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          amount: invoice.amount_paid / 100,
          platformFee: Math.round(invoice.amount_paid * 0.05) / 100, // 5% platform fee
          netAmount: (invoice.amount_paid - Math.round(invoice.amount_paid * 0.05)) / 100,
          purchasedAt: new Date(),
          status: "completed",
          pricingModel: "subscription",
          isRecurring: true,
          periodStart: new Date(subscription.current_period_start * 1000),
          periodEnd: new Date(subscription.current_period_end * 1000),
        })

      // Update video stats
      await db
        .collection("videos")
        .doc(videoId)
        .update({
          totalRevenue: db.FieldValue.increment(invoice.amount_paid / 100),
        })

      console.log(`Processed recurring payment for subscription ${subscription.id}`)
    }
  } catch (error) {
    console.error("Error handling invoice.paid:", error)
  }
}

// Handle customer.subscription.deleted event
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const { videoId, buyerUid, creatorUid } = subscription.metadata

    if (!videoId || !buyerUid || !creatorUid) {
      console.log("Missing metadata in deleted subscription:", subscription.id)
      return
    }

    // Update the user's access to mark it as expired
    await db.collection("userAccess").doc(buyerUid).collection("videos").doc(videoId).update({
      expiresAt: new Date(),
      subscriptionStatus: "canceled",
      canceledAt: new Date(),
    })

    console.log(`Subscription ${subscription.id} for video ${videoId} has been canceled`)
  } catch (error) {
    console.error("Error handling subscription.deleted:", error)
  }
}
