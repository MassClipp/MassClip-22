import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    console.error("❌ [Webhook] Missing signature or webhook secret")
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    console.log("✅ [Webhook] Event verified:", event.type)
  } catch (err: any) {
    console.error("❌ [Webhook] Signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      default:
        console.log(`🔔 [Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("🎉 [Webhook] Processing checkout session completed:", session.id)

  // CRITICAL: Validate buyer UID exists in metadata
  const buyerUid = session.metadata?.buyerUid
  if (!buyerUid) {
    console.error("❌ [Webhook] CRITICAL: No buyer UID in session metadata - anonymous purchase attempt blocked")
    console.error("   Session ID:", session.id)
    console.error("   Available metadata:", session.metadata)
    return
  }

  console.log("✅ [Webhook] Buyer UID found:", buyerUid)

  const bundleId = session.metadata?.bundleId
  const creatorId = session.metadata?.creatorId

  if (!bundleId || !creatorId) {
    console.error("❌ [Webhook] Missing bundle or creator ID in metadata")
    return
  }

  // Verify buyer exists in database
  const buyerDoc = await db.collection("users").doc(buyerUid).get()
  if (!buyerDoc.exists) {
    console.error("❌ [Webhook] Buyer not found in database:", buyerUid)
    return
  }

  const buyerData = buyerDoc.data()!

  // Create purchase record with buyer UID
  const purchaseData = {
    buyerUid: buyerUid, // CRITICAL: Always include buyer UID
    buyerEmail: session.metadata?.buyerEmail || buyerData.email || "",
    buyerName: session.metadata?.buyerName || buyerData.displayName || "",
    bundleId: bundleId,
    creatorId: creatorId,
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    amountTotal: session.amount_total,
    currency: session.currency,
    status: "completed",
    purchaseDate: new Date(),
    metadata: session.metadata,
  }

  // Save purchase record
  await db.collection("purchases").add(purchaseData)
  console.log("✅ [Webhook] Purchase record created for buyer:", buyerUid)

  // Grant access to bundle content
  await grantBundleAccess(buyerUid, bundleId, creatorId)

  // Update creator sales stats
  await updateCreatorSales(creatorId, session.amount_total || 0, session.currency || "usd")
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("💰 [Webhook] Processing payment intent succeeded:", paymentIntent.id)

  // CRITICAL: Validate buyer UID exists in metadata
  const buyerUid = paymentIntent.metadata?.buyerUid
  if (!buyerUid) {
    console.error("❌ [Webhook] CRITICAL: No buyer UID in payment intent metadata - anonymous payment blocked")
    console.error("   Payment Intent ID:", paymentIntent.id)
    console.error("   Available metadata:", paymentIntent.metadata)
    return
  }

  console.log("✅ [Webhook] Payment confirmed for buyer:", buyerUid)
}

async function grantBundleAccess(buyerUid: string, bundleId: string, creatorId: string) {
  try {
    const accessData = {
      buyerUid: buyerUid, // CRITICAL: Include buyer UID
      bundleId: bundleId,
      creatorId: creatorId,
      grantedAt: new Date(),
      accessType: "purchased",
    }

    await db.collection("bundle_access").add(accessData)
    console.log("✅ [Webhook] Bundle access granted to buyer:", buyerUid)
  } catch (error) {
    console.error("❌ [Webhook] Failed to grant bundle access:", error)
  }
}

async function updateCreatorSales(creatorId: string, amount: number, currency: string) {
  try {
    const salesData = {
      creatorId: creatorId,
      amount: amount,
      currency: currency,
      saleDate: new Date(),
      environment: process.env.NODE_ENV === "production" ? "live" : "test",
    }

    await db.collection("sales").add(salesData)
    console.log("✅ [Webhook] Sales record created for creator:", creatorId)
  } catch (error) {
    console.error("❌ [Webhook] Failed to update creator sales:", error)
  }
}
