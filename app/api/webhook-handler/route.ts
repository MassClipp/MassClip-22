import { NextResponse } from "next/server"
import Stripe from "stripe"
import { MembershipService } from "@/lib/membership-service"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  const payload = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    console.error("🪝 WEBHOOK ERROR: Missing stripe-signature header")
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    console.log(`🪝 WEBHOOK: Received event type: ${event.type}`)
  } catch (err: any) {
    console.error(`🪝 WEBHOOK ERROR: Signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  // Store raw event for debugging
  try {
    await adminDb.collection("stripeWebhookEvents").add({
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date(),
      rawEvent: JSON.parse(payload),
    })
  } catch (error) {
    console.error("🪝 WEBHOOK ERROR: Failed to store raw event:", error)
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`🪝 WEBHOOK: Processing checkout.session.completed for session ${session.id}`)

      if (session.mode === "subscription") {
        const subscriptionId = session.subscription
        const customerId = session.customer
        const userId = session.metadata?.firebaseUid

        if (!userId || !subscriptionId || !customerId) {
          console.error(
            `🪝 WEBHOOK ERROR: Missing data in session ${session.id}. UID: ${userId}, SubID: ${subscriptionId}, CustID: ${customerId}`,
          )
          return NextResponse.json({ error: "Missing required data in session metadata" }, { status: 400 })
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
          await MembershipService.upgradeToPro(
            userId,
            customerId as string,
            subscriptionId as string,
            new Date(subscription.current_period_end * 1000),
          )
          console.log(`🪝 WEBHOOK: Successfully upgraded user ${userId} to pro.`)
        } catch (error) {
          console.error(`🪝 WEBHOOK ERROR: Failed to upgrade user ${userId}:`, error)
          return NextResponse.json({ error: "Failed to process subscription upgrade" }, { status: 500 })
        }
      }
      break
    }

    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      // For 'updated', check if it's a cancellation at period end
      if (event.type === "customer.subscription.updated" && !subscription.cancel_at_period_end) {
        console.log(`🪝 WEBHOOK: Ignoring subscription update for ${subscription.id} (not a cancellation).`)
        break
      }

      console.log(`🪝 WEBHOOK: Processing subscription cancellation for ${subscription.id}`)
      const customerId = subscription.customer as string

      try {
        await MembershipService.downgradeToFree(customerId)
        console.log(`🪝 WEBHOOK: Successfully downgraded user with customer ID ${customerId}.`)
      } catch (error) {
        console.error(`🪝 WEBHOOK ERROR: Failed to downgrade user with customer ID ${customerId}:`, error)
        return NextResponse.json({ error: "Failed to process subscription downgrade" }, { status: 500 })
      }
      break
    }

    default:
      console.log(`🪝 WEBHOOK: Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
