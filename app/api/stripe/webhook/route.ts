import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

export async function POST(request: Request) {
  console.log("------------ 🪝 STRIPE WEBHOOK START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🪝 WEBHOOK ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("🪝 WEBHOOK ERROR: Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Get the signature from the headers
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      console.error("🪝 WEBHOOK ERROR: Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    // Get the raw body
    const rawBody = await request.text()

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err: any) {
      console.error(`🪝 WEBHOOK ERROR: ${err.message}`)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    console.log(`🪝 WEBHOOK: Received event type: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`🪝 WEBHOOK: Checkout session completed: ${session.id}`)

        // Get metadata from the session
        const metadata = session.metadata || {}
        const creatorId = metadata.creatorId
        const buyerId = metadata.buyerId
        const buyerEmail = metadata.buyerEmail || session.customer_email

        if (!creatorId || !buyerId) {
          console.error("🪝 WEBHOOK ERROR: Missing creatorId or buyerId in metadata")
          return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
        }

        // Update the checkout session in Firestore
        try {
          await db.collection("checkoutSessions").doc(session.id).update({
            status: "completed",
            completedAt: new Date(),
            paymentIntent: session.payment_intent,
            subscription: session.subscription,
          })
          console.log(`🪝 WEBHOOK: Updated checkout session ${session.id} in Firestore`)
        } catch (error) {
          console.error("🪝 WEBHOOK ERROR: Failed to update checkout session in Firestore:", error)
          // Continue anyway, as this is not critical
        }

        // Grant access to the buyer
        try {
          // Record the purchase in the buyer's purchases collection
          await db
            .collection("users")
            .doc(buyerId)
            .collection("purchases")
            .doc(session.id)
            .set({
              creatorId,
              sessionId: session.id,
              purchaseDate: new Date(),
              paymentIntent: session.payment_intent,
              subscription: session.subscription,
              mode: session.mode,
              amount: session.amount_total ? session.amount_total / 100 : null,
              currency: session.currency,
            })

          // Grant premium access to the creator's content
          await db.collection("premiumAccess").doc(buyerId).collection("creators").doc(creatorId).set({
            creatorId,
            grantedAt: new Date(),
            sessionId: session.id,
            subscription: session.subscription,
            mode: session.mode,
            active: true,
          })

          console.log(`🪝 WEBHOOK: Granted premium access to ${buyerId} for creator ${creatorId}`)
        } catch (error) {
          console.error("🪝 WEBHOOK ERROR: Failed to grant access:", error)
          return NextResponse.json({ error: "Failed to grant access" }, { status: 500 })
        }

        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`🪝 WEBHOOK: Invoice paid: ${invoice.id}`)

        // Handle subscription renewal
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const metadata = subscription.metadata || {}
          const creatorId = metadata.creatorId
          const buyerId = metadata.buyerId

          if (creatorId && buyerId) {
            // Update premium access status
            await db.collection("premiumAccess").doc(buyerId).collection("creators").doc(creatorId).update({
              renewedAt: new Date(),
              active: true,
            })

            console.log(`🪝 WEBHOOK: Updated premium access for ${buyerId} to creator ${creatorId}`)
          }
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`🪝 WEBHOOK: Subscription deleted: ${subscription.id}`)

        // Handle subscription cancellation
        const metadata = subscription.metadata || {}
        const creatorId = metadata.creatorId
        const buyerId = metadata.buyerId

        if (creatorId && buyerId) {
          // Update premium access status
          await db.collection("premiumAccess").doc(buyerId).collection("creators").doc(creatorId).update({
            canceledAt: new Date(),
            active: false,
          })

          console.log(`🪝 WEBHOOK: Marked premium access as inactive for ${buyerId} to creator ${creatorId}`)
        }

        break
      }

      default:
        console.log(`🪝 WEBHOOK: Unhandled event type: ${event.type}`)
    }

    console.log("------------ 🪝 STRIPE WEBHOOK END ------------")
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("🪝 WEBHOOK ERROR:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to process webhook",
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}

// Disable body parsing for webhook endpoint
export const config = {
  api: {
    bodyParser: false,
  },
}
