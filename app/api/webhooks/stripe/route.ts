import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"
import {
  processCheckoutSessionCompleted,
  processSubscriptionDeleted,
  processSubscriptionUpdated,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE!

async function processBundlePurchase(session: Stripe.Checkout.Session) {
  console.log(`🛒 [Bundle Webhook] Processing bundle purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { bundleId, productBoxId, buyerUid, creatorId, buyerEmail, buyerName, buyerPlan } = metadata

  const itemId = bundleId || productBoxId
  if (!itemId) {
    throw new Error("Missing bundle/productBox ID in session metadata")
  }

  if (!buyerUid) {
    throw new Error("Missing buyer UID in session metadata")
  }

  // Get bundle details
  const bundleDoc = await adminDb.collection("bundles").doc(itemId).get()
  if (!bundleDoc.exists) {
    throw new Error(`Bundle not found: ${itemId}`)
  }

  const bundleData = bundleDoc.data()!

  // Get creator details
  let creatorData = { name: "Unknown Creator", username: "unknown" }
  if (creatorId) {
    const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
    if (creatorDoc.exists) {
      const creator = creatorDoc.data()!
      creatorData = {
        name: creator.displayName || creator.name || creator.username || "Unknown Creator",
        username: creator.username || "unknown",
      }
    }
  }

  // Create bundle purchase record
  const purchaseData = {
    id: session.id,
    bundleId: itemId,
    productBoxId: itemId,
    bundleTitle: bundleData.title || "Untitled Bundle",
    description: bundleData.description || "Premium content bundle",
    thumbnailUrl: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg",

    // Creator info
    creatorId: creatorId || "unknown",
    creatorName: creatorData.name,
    creatorUsername: creatorData.username,

    // Buyer info
    buyerUid: buyerUid,
    userId: buyerUid,
    userEmail: buyerEmail || "",
    userName: buyerName || "Anonymous User",
    isAuthenticated: buyerUid !== "anonymous",

    // Purchase details
    amount: session.amount_total ? session.amount_total / 100 : 0,
    currency: session.currency || "usd",
    status: "completed",

    // Stripe details
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,

    // Content info
    contents: bundleData.contents || [],
    items: bundleData.contents || [],
    itemNames: (bundleData.contents || []).map((item: any) => item.title || item.name || "Untitled"),
    contentCount: (bundleData.contents || []).length,

    // Timestamps
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    purchasedAt: new Date().toISOString(),

    // Access control
    accessToken: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: "stripe_webhook",
  }

  // Store in bundlePurchases collection
  await adminDb.collection("bundlePurchases").doc(session.id).set(purchaseData)

  console.log(`✅ [Bundle Webhook] Bundle purchase created: ${session.id} for user ${buyerUid}`)
}

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig) {
    console.error("Webhook Error: Missing signature.")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      throw new Error("No webhook secret configured")
    }
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`)

    console.error("Signature:", sig)
    console.error("Body length:", body.length)
    console.error("Webhook secret configured:", !!webhookSecret)

    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`✅ [Bundle Webhook] Received event: ${event.type} (${event.id})`)
  console.log(`📋 [Bundle Webhook] Event metadata:`, event.data.object.metadata || {})

  try {
    // Test Firebase connection with a simple operation
    await adminDb.collection("_test").limit(1).get()
  } catch (error) {
    console.error("❌ Firebase not accessible in webhook:", error)
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
  }

  // Store raw event for diagnostics (non-blocking)
  adminDb
    .collection("stripeEvents")
    .add({
      id: event.id,
      type: event.type,
      object: event.object,
      api_version: event.api_version,
      data: event.data,
      created: new Date(event.created * 1000),
    })
    .catch((error) => {
      console.error("Failed to store raw stripe event", error)
    })

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session

        const metadata = session.metadata || {}
        const contentType = metadata.contentType
        const bundleId = metadata.bundleId || metadata.productBoxId

        if (contentType === "bundle" || bundleId) {
          // Handle bundle purchase
          await processBundlePurchase(session)
        } else {
          // Handle subscription (Creator Pro upgrade)
          await processCheckoutSessionCompleted(session)
        }
        break

      case "customer.subscription.updated":
        await processSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  } catch (error: any) {
    console.error(`Webhook handler failed for event ${event.type}.`, error)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
