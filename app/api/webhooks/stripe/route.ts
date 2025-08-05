import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Use the correct environment variable name
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE!

export async function POST(req: NextRequest) {
  console.log("🚀 Stripe webhook received")

  try {
    // Get raw body as text
    const body = await req.text()
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    console.log("🔍 Webhook verification details:")
    console.log("- Body length:", body.length)
    console.log("- Has signature:", !!signature)
    console.log("- Using STRIPE_WEBHOOK_SECRET_LIVE")
    console.log("- Webhook secret format: whsec_***")

    if (!signature) {
      console.error("❌ Missing Stripe signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Validate webhook secret
    if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
      console.error("❌ Invalid webhook secret format")
      console.error("- Looking for: STRIPE_WEBHOOK_SECRET_LIVE")
      console.error("- Found:", !!webhookSecret)
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 500 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log("✅ Webhook signature verified successfully!")
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:")
      console.error("- Error message:", err.message)
      console.error("- Error type:", err.type)

      return NextResponse.json(
        {
          error: `Webhook signature verification failed: ${err.message}`,
          debug: {
            hasSecret: !!webhookSecret,
            hasSignature: !!signature,
            bodyLength: body.length,
            secretFormat: webhookSecret.startsWith("whsec_") ? "correct" : "invalid",
            errorType: err.type,
          },
        },
        { status: 400 },
      )
    }

    console.log(`🎯 Processing event: ${event.type} (${event.id})`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Checkout session completed: ${session.id}`)
  console.log(`📋 Metadata:`, session.metadata)

  const creatorId = session.metadata?.creatorId
  const bundleId = session.metadata?.bundleId
  const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

  if (!creatorId || !bundleId) {
    console.error("❌ Missing required metadata:", { creatorId, bundleId })
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
  }

  // Check for duplicate processing
  const existingPurchase = await adminDb.collection("bundlePurchases").doc(session.id).get()
  if (existingPurchase.exists) {
    console.log(`⚠️ Purchase already processed: ${session.id}`)
    return NextResponse.json({ received: true, message: "Already processed" })
  }

  // Get creator info
  const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
  if (!creatorDoc.exists) {
    console.error(`❌ Creator not found: ${creatorId}`)
    return NextResponse.json({ error: "Creator not found" }, { status: 400 })
  }

  const creatorData = creatorDoc.data()!
  const creatorStripeAccountId = creatorData.stripeAccountId

  if (!creatorStripeAccountId) {
    console.error(`❌ Creator missing Stripe account: ${creatorId}`)
    return NextResponse.json({ error: "Creator Stripe account not found" }, { status: 400 })
  }

  // Verify session through connected account
  let verifiedSession: Stripe.Checkout.Session
  try {
    verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "payment_intent"],
      stripeAccount: creatorStripeAccountId,
    })
    console.log(`✅ Session verified through connected account`)
  } catch (error: any) {
    console.error(`❌ Session verification failed:`, error.message)
    return NextResponse.json({ error: "Session verification failed" }, { status: 400 })
  }

  // Get bundle data
  const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()
  if (!bundleDoc.exists) {
    console.error(`❌ Bundle not found: ${bundleId}`)
    return NextResponse.json({ error: "Bundle not found" }, { status: 400 })
  }

  const bundleData = bundleDoc.data()!
  const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

  if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
    console.error(`❌ No content in bundle: ${bundleId}`)
    return NextResponse.json({ error: "No bundle content found" }, { status: 400 })
  }

  // Format content
  const formattedBundleContent = bundleContent.map((item: any, index: number) => ({
    id: item.id || item.videoId || `content_${index}`,
    fileUrl: item.fileUrl || item.videoUrl || item.url || "",
    fileSize: item.fileSize || 0,
    displayTitle: item.displayTitle || item.title || `Video ${index + 1}`,
    displaySize: item.displaySize || "0 MB",
    duration: item.duration || 0,
    filename: item.filename || item.title || `video_${index + 1}`,
    mimeType: item.mimeType || "video/mp4",
  }))

  // Create purchase record
  const purchaseData = {
    sessionId: session.id,
    paymentIntentId:
      typeof verifiedSession.payment_intent === "string"
        ? verifiedSession.payment_intent
        : verifiedSession.payment_intent?.id || "",
    creatorId: creatorId,
    creatorStripeAccountId: creatorStripeAccountId,
    bundleId: bundleId,
    buyerUid: buyerUid,
    status: "completed",
    webhookProcessed: true,
    timestamp: adminDb.FieldValue.serverTimestamp(),
    bundleContent: formattedBundleContent,
  }

  await adminDb.collection("bundlePurchases").doc(session.id).set(purchaseData)

  console.log(`✅ Purchase processed successfully:`, {
    sessionId: session.id,
    bundleId: bundleId,
    creatorId: creatorId,
    contentItems: formattedBundleContent.length,
  })

  return NextResponse.json({
    received: true,
    message: "Purchase processed successfully",
    purchaseId: session.id,
    contentItems: formattedBundleContent.length,
  })
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 Payment intent succeeded: ${paymentIntent.id}`)

  try {
    // Update any existing purchase records with payment intent info
    const purchasesQuery = await adminDb
      .collection("bundlePurchases")
      .where("paymentIntentId", "==", paymentIntent.id)
      .get()

    for (const doc of purchasesQuery.docs) {
      await doc.ref.update({
        paymentIntentStatus: paymentIntent.status,
        paymentIntentSucceededAt: new Date(),
        updatedAt: new Date(),
      })

      console.log(`✅ Updated purchase record: ${doc.id}`)
    }

    console.log(`✅ Successfully processed payment intent: ${paymentIntent.id}`)
  } catch (error) {
    console.error(`❌ Error processing payment intent ${paymentIntent.id}:`, error)
    throw error
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`🧾 Invoice payment succeeded: ${invoice.id}`)

  try {
    // Handle subscription-related purchases
    if (invoice.subscription) {
      console.log(`📅 Processing subscription invoice: ${invoice.subscription}`)
      // Add subscription-specific logic here if needed
    }

    console.log(`✅ Successfully processed invoice: ${invoice.id}`)
  } catch (error) {
    console.error(`❌ Error processing invoice ${invoice.id}:`, error)
    throw error
  }
}
