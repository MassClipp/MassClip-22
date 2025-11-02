import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// Use separate webhook secret for Starter plan
const webhookSecret = process.env.STARTER_PLAN_WH || process.env.STRIPE_WEBHOOK_SECRET_LIVE!

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`❌ [STARTER WEBHOOK] Signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`\n========== STARTER PLAN WEBHOOK ==========`)
  console.log(`[v0] ✅ Event Type: ${event.type}`)
  console.log(`[v0] 📋 Event ID: ${event.id}`)
  console.log(`[v0] ⏰ Timestamp: ${new Date().toISOString()}`)
  console.log(`==========================================\n`)

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription =
          event.type === "checkout.session.completed"
            ? await stripe.subscriptions.retrieve((event.data.object as Stripe.Checkout.Session).subscription as string)
            : (event.data.object as Stripe.Subscription)

        const uid = subscription.metadata.buyerUid
        if (!uid) {
          throw new Error("No buyerUid in subscription metadata")
        }

        const isActive = subscription.status === "active" || subscription.status === "trialing"

        const membershipData = {
          plan: "starter",
          status: subscription.status,
          priceId: subscription.items.data[0]?.price.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          isActive: isActive,
          features: {
            maxBundles: 5,
            maxVideosPerBundle: 15,
            maxFolders: 3,
            noWatermark: false,
            platformFeePercentage: 20,
            premiumContent: false,
            prioritySupport: false,
            unlimitedDownloads: false,
            isActive: isActive,
          },
          updatedAt: new Date().toISOString(),
          email: subscription.metadata.buyerEmail || "",
        }

        console.log(`[v0] 💾 Writing STARTER membership for user ${uid}:`, JSON.stringify(membershipData, null, 2))

        // Complete overwrite - no merge
        await adminDb.collection("memberships").doc(uid).set(membershipData)

        console.log(`[v0] ✅ STARTER membership set successfully`)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const uid = subscription.metadata.buyerUid

        if (uid) {
          await adminDb.collection("memberships").doc(uid).update({
            isActive: false,
            "features.isActive": false,
            canceledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          console.log(`[v0] ✅ STARTER subscription canceled for user ${uid}`)
        }
        break
      }
    }

    return NextResponse.json({ received: true, plan: "starter" })
  } catch (error: any) {
    console.error(`[v0] ❌ STARTER WEBHOOK ERROR:`, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
