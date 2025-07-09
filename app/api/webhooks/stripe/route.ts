import { type NextRequest, NextResponse } from "next/server"
import { stripe, stripeConfig } from "@/lib/stripe"
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
    console.log("✅ [Webhook] Firebase Admin initialized")
  } catch (error) {
    console.error("❌ [Webhook] Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()

// Get the appropriate webhook secret based on environment
const getWebhookSecret = () => {
  if (stripeConfig.isLiveMode) {
    const liveSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET
    if (!liveSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET_LIVE is not set")
    }
    return liveSecret
  } else {
    const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET
    if (!testSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET_TEST is not set")
    }
    return testSecret
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    console.error("❌ [WEBHOOK] No Stripe signature found")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: any

  try {
    const webhookSecret = getWebhookSecret()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log(`🔥 [WEBHOOK] Event received: ${event.type} (${stripeConfig.environment} mode)`)
  } catch (err) {
    console.error(`❌ [WEBHOOK] Signature verification failed:`, err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object)
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      default:
        console.log(`🔄 [WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`❌ [WEBHOOK] Error processing ${event.type}:`, error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log(`🔥 [WEBHOOK] Processing checkout.session.completed: ${session.id}`)
  console.log(`🔥 [WEBHOOK] Session mode: ${session.mode}`)
  console.log(`🔥 [WEBHOOK] Payment status: ${session.payment_status}`)
  console.log(`🔥 [WEBHOOK] Environment: ${stripeConfig.environment}`)

  const userId = session.client_reference_id || session.metadata?.userId
  const sessionId = session.id

  if (!userId) {
    console.error("❌ [WEBHOOK] No user ID found in session")
    return
  }

  try {
    // Create purchase record in user's purchases collection
    const purchaseData = {
      sessionId: sessionId,
      userId: userId,
      amount: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      mode: session.mode,
      environment: stripeConfig.environment,
      purchasedAt: new Date(),
      metadata: session.metadata || {},
      stripeCustomerId: session.customer,
      paymentIntentId: session.payment_intent,
    }

    // Add type-specific data
    if (session.metadata?.type === "product_box_purchase") {
      purchaseData.type = "product_box"
      purchaseData.productBoxId = session.metadata.productBoxId
      purchaseData.itemTitle = `Product Box: ${session.metadata.productBoxId}`
    } else if (session.metadata?.type === "premium_subscription") {
      purchaseData.type = "subscription"
      purchaseData.subscriptionId = session.subscription
      purchaseData.itemTitle = "Premium Subscription"
    }

    // Store in user's purchases collection
    await db.collection("users").doc(userId).collection("purchases").doc(sessionId).set(purchaseData)
    console.log(`✅ [WEBHOOK] Created purchase record for user: ${userId}`)

    // Also store in unified purchases collection
    await db.collection("userPurchases").doc(userId).collection("purchases").doc(sessionId).set(purchaseData)
    console.log(`✅ [WEBHOOK] Created unified purchase record`)

    // Update checkout session status
    try {
      await db.collection("checkoutSessions").doc(sessionId).update({
        status: "completed",
        completedAt: new Date(),
        webhookProcessedAt: new Date(),
      })
      console.log(`✅ [WEBHOOK] Updated checkout session status`)
    } catch (updateError) {
      console.error("Failed to update checkout session:", updateError)
    }
  } catch (error) {
    console.error(`❌ [WEBHOOK] Failed to process checkout session:`, error)
    throw error
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log(`🔥 [WEBHOOK] Processing payment_intent.succeeded: ${paymentIntent.id}`)
  // Additional payment intent processing if needed
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log(`🔥 [WEBHOOK] Processing invoice.payment_succeeded: ${invoice.id}`)
  // Additional invoice processing if needed
}

// Handle GET requests (for webhook endpoint verification)
export async function GET() {
  const finalSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  const actuallyUsingTestMode = finalSecretKey?.startsWith("sk_test_")

  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
    environment: actuallyUsingTestMode ? "test" : "live",
    webhookSecretConfigured: actuallyUsingTestMode
      ? !!process.env.STRIPE_WEBHOOK_SECRET_TEST
      : !!process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  })
}
