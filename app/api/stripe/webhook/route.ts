import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
})

// Determine which webhook secret to use based on the Stripe key
const usingLiveKey = stripeSecretKey?.startsWith("sk_live_")
const usingTestKey = stripeSecretKey?.startsWith("sk_test_")

let webhookSecret: string
if (usingLiveKey) {
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET!
  console.log("🔴 [Stripe Webhook] Using LIVE webhook secret")
} else if (usingTestKey) {
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET!
  console.log("🟢 [Stripe Webhook] Using TEST webhook secret")
} else {
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  console.log("⚠️ [Stripe Webhook] Using general webhook secret")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("❌ [Stripe Webhook] No signature found in request")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Stripe Webhook] Signature verified for event: ${event.type}`)
    } catch (err: any) {
      console.error(`❌ [Stripe Webhook] Webhook signature verification failed:`, {
        error: err.message,
        usingLiveKey,
        usingTestKey,
        webhookSecretLength: webhookSecret?.length,
        signaturePresent: !!signature,
      })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`🔔 [Stripe Webhook] Processing event: ${event.type} (${usingLiveKey ? "LIVE" : "TEST"} mode)`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      default:
        console.log(`🔔 [Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error processing webhook:`, error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`✅ [Stripe Webhook] Processing checkout session completed: ${session.id}`)

    const { customer_details, metadata, amount_total, currency } = session

    if (!metadata?.productBoxId || !metadata?.buyerUid) {
      console.error(`❌ [Stripe Webhook] Missing required metadata in session: ${session.id}`, {
        metadata,
        hasProductBoxId: !!metadata?.productBoxId,
        hasBuyerUid: !!metadata?.buyerUid,
      })
      return
    }

    const purchaseData = {
      id: session.id,
      sessionId: session.id,
      stripeSessionId: session.id,
      paymentIntentId: session.payment_intent as string,
      productBoxId: metadata.productBoxId,
      bundleId: metadata.productBoxId, // For backward compatibility
      userId: metadata.buyerUid,
      creatorUid: metadata.creatorUid,
      amount: (amount_total || 0) / 100, // Convert from cents
      currency: currency || "usd",
      status: "complete",
      customerEmail: customer_details?.email || "",
      webhookProcessedAt: new Date().toISOString(),
      webhookEventId: event.id || `evt_${Date.now()}`,
      createdAt: new Date().toISOString(),
      metadata: metadata,
      mode: usingLiveKey ? "live" : "test",
    }

    // Store purchase in multiple locations for redundancy
    const batch = db.batch()

    // 1. User's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(metadata.buyerUid).collection("purchases").doc(session.id)
    batch.set(userPurchaseRef, purchaseData)

    // 2. Unified purchases collection
    const unifiedPurchaseRef = db
      .collection("userPurchases")
      .doc(metadata.buyerUid)
      .collection("purchases")
      .doc(session.id)
    batch.set(unifiedPurchaseRef, purchaseData)

    await batch.commit()

    console.log(
      `✅ [Stripe Webhook] Purchase recorded successfully for session: ${session.id} (${usingLiveKey ? "LIVE" : "TEST"} mode)`,
    )
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error handling checkout session completed:`, error)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`✅ [Stripe Webhook] Processing payment intent succeeded: ${paymentIntent.id}`)
    // Additional processing if needed
    console.log(`✅ [Stripe Webhook] Payment intent processed: ${paymentIntent.id}`)
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error handling payment intent succeeded:`, error)
  }
}
