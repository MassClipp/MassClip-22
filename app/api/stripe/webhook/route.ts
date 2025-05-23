import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("Received Stripe webhook:", event.type)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleSuccessfulPayment(session)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log("Payment succeeded:", paymentIntent.id)
        break
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdate(account)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  try {
    const { videoId, buyerUid, creatorUid } = session.metadata!

    console.log("Processing successful payment:", {
      sessionId: session.id,
      videoId,
      buyerUid,
      creatorUid,
    })

    // Grant access to the buyer
    await db
      .collection("userAccess")
      .doc(buyerUid)
      .collection("videos")
      .doc(videoId)
      .set({
        purchasedAt: new Date(),
        sessionId: session.id,
        amount: session.amount_total! / 100, // Convert from cents to dollars
        creatorUid: creatorUid,
      })

    // Record sale for the creator
    await db
      .collection("users")
      .doc(creatorUid)
      .collection("sales")
      .add({
        videoId: videoId,
        buyerUid: buyerUid,
        sessionId: session.id,
        amount: session.amount_total! / 100,
        platformFee: Math.round(session.amount_total! * 0.05) / 100,
        netAmount: (session.amount_total! - Math.round(session.amount_total! * 0.05)) / 100,
        purchasedAt: new Date(),
        status: "completed",
      })

    // Update video stats
    await db
      .collection("videos")
      .doc(videoId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total! / 100),
      })

    console.log("Successfully processed payment and granted access")
  } catch (error) {
    console.error("Error handling successful payment:", error)
  }
}

async function handleAccountUpdate(account: Stripe.Account) {
  try {
    const firebaseUid = account.metadata?.firebaseUid
    if (!firebaseUid) return

    const isOnboarded = account.details_submitted && account.charges_enabled
    const canReceivePayments = account.payouts_enabled

    await db.collection("users").doc(firebaseUid).update({
      stripeOnboarded: isOnboarded,
      stripePayoutsEnabled: canReceivePayments,
      stripeStatusLastChecked: new Date(),
    })

    console.log("Updated user Stripe status:", { firebaseUid, isOnboarded, canReceivePayments })
  } catch (error) {
    console.error("Error handling account update:", error)
  }
}
