import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { getAdminDb, initializeFirebaseAdmin, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
import {
  processCheckoutSessionCompleted,
  processSubscriptionDeleted,
  processSubscriptionUpdated,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  console.log("🔔 [Webhook] Received Stripe webhook event")

  // Force Firebase Admin initialization
  try {
    console.log("🔄 [Webhook] Checking Firebase Admin initialization...")

    if (!isFirebaseAdminInitialized()) {
      console.log("⚠️ [Webhook] Firebase Admin not initialized, initializing now...")
      initializeFirebaseAdmin()
    }

    // Test database connection
    const db = getAdminDb()
    console.log("✅ [Webhook] Firebase Admin initialized and database accessible")

    // Test write to verify permissions
    await db.collection("webhookTests").add({
      timestamp: new Date(),
      test: "webhook-initialization-test",
    })
    console.log("✅ [Webhook] Database write test successful")
  } catch (error: any) {
    console.error("❌ [Webhook] Firebase initialization failed:", error)
    console.error("❌ [Webhook] Error details:", {
      message: error.message,
      stack: error.stack,
      env: {
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      },
    })
    return NextResponse.json(
      {
        error: "Firebase initialization failed",
        details: error.message,
      },
      { status: 500 },
    )
  }

  const sig = headers().get("stripe-signature")
  const body = await request.text()

  if (!sig || !webhookSecret) {
    console.error("❌ [Webhook] Missing signature or secret")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    console.log(`✅ [Webhook] Event verified: ${event.type} (${event.id})`)
  } catch (err: any) {
    console.error(`❌ [Webhook] Signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Store raw event for diagnostics
  try {
    const db = getAdminDb()
    await db.collection("stripeEvents").add({
      id: event.id,
      type: event.type,
      object: event.object,
      api_version: event.api_version,
      data: event.data,
      created: new Date(event.created * 1000),
      processedAt: new Date(),
    })
    console.log(`📝 [Webhook] Event stored in stripeEvents collection`)
  } catch (error) {
    console.error("⚠️ [Webhook] Failed to store raw stripe event", error)
  }

  try {
    console.log(`🔄 [Webhook] Processing event type: ${event.type}`)

    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        console.log(`✅ [Webhook] Successfully processed checkout.session.completed`)
        break
      case "customer.subscription.updated":
        await processSubscriptionUpdated(event.data.object as Stripe.Subscription)
        console.log(`✅ [Webhook] Successfully processed customer.subscription.updated`)
        break
      case "customer.subscription.deleted":
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription)
        console.log(`✅ [Webhook] Successfully processed customer.subscription.deleted`)
        break
      case "invoice.payment_succeeded":
        // Handle invoice payment succeeded for subscription renewals
        console.log(`ℹ️ [Webhook] Ignoring invoice.payment_succeeded (handled by subscription events)`)
        break
      default:
        console.log(`ℹ️ [Webhook] Unhandled event type ${event.type}`)
    }
  } catch (error: any) {
    console.error(`❌ [Webhook] Handler failed for event ${event.type}:`, error)
    return NextResponse.json(
      {
        error: "Webhook handler failed",
        details: error.message,
        eventType: event.type,
        eventId: event.id,
      },
      { status: 500 },
    )
  }

  console.log(`✅ [Webhook] Event ${event.type} processed successfully`)
  return NextResponse.json({ received: true, eventType: event.type, eventId: event.id })
}
