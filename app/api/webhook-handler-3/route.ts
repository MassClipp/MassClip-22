import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

type DebugTrace = string[]

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY")
  return new Stripe(key, { apiVersion: "2023-10-16" })
}

const webhookSecret = process.env.WEBHOOK_SECRET_KEY_3!

async function handleDownloadPurchase(session: Stripe.Checkout.Session, debugTrace: DebugTrace) {
  debugTrace.push(`Handling download purchase: ${session.id}`)

  const metadata = session.metadata || {}
  debugTrace.push(`Session metadata: ${JSON.stringify(metadata)}`)

  const { buyerUid, buyerEmail, downloadCount } = metadata

  if (!buyerUid) {
    debugTrace.push("No buyerUid in session metadata")
    return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
  }

  const downloadsToAdd = Number.parseInt(downloadCount || "0")
  if (downloadsToAdd <= 0) {
    debugTrace.push(`Invalid download count: ${downloadCount}`)
    return NextResponse.json({ error: "Invalid download count", debugTrace }, { status: 400 })
  }

  debugTrace.push(`Adding ${downloadsToAdd} downloads to user ${buyerUid}`)

  try {
    const freeUserDoc = await adminDb.collection("freeUsers").doc(buyerUid).get()

    if (freeUserDoc.exists) {
      const currentData = freeUserDoc.data()
      const currentLimit = currentData?.downloadLimit || 15 // Default limit is 15
      const newLimit = currentLimit + downloadsToAdd
      debugTrace.push(
        `Free user found - current limit: ${currentLimit}, adding: ${downloadsToAdd}, new limit: ${newLimit}`,
      )

      await adminDb.collection("freeUsers").doc(buyerUid).update({
        downloadLimit: newLimit,
        lastDownloadPurchase: new Date(),
      })

      debugTrace.push(`Updated user ${buyerUid} downloadLimit from ${currentLimit} to ${newLimit}`)
    } else {
      // Create new free user record with increased limit
      const newLimit = 15 + downloadsToAdd // Base 15 + purchased amount
      await adminDb.collection("freeUsers").doc(buyerUid).set({
        email: buyerEmail,
        downloadLimit: newLimit,
        lastDownloadPurchase: new Date(),
        createdAt: new Date(),
      })

      debugTrace.push(`Created new user ${buyerUid} with downloadLimit: ${newLimit}`)
    }

    // Record the purchase
    await adminDb.collection("downloadPurchases").add({
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      buyerUid,
      buyerEmail,
      downloadCount: downloadsToAdd,
      amount: session.amount_total,
      currency: session.currency,
      status: "completed",
      createdAt: new Date(),
    })

    debugTrace.push("Download purchase completed successfully")
  } catch (error: any) {
    debugTrace.push(`Error processing download purchase: ${error.message}`)
    throw error
  }

  return NextResponse.json({ received: true, debugTrace })
}

export async function POST(request: Request) {
  const debugTrace: DebugTrace = []

  try {
    if (!webhookSecret) {
      debugTrace.push("Missing WEBHOOK_SECRET_KEY_3")
      return NextResponse.json({ error: "Server configuration error", debugTrace }, { status: 500 })
    }

    try {
      await adminDb.collection("test").limit(1).get()
      debugTrace.push("Firebase initialized successfully")
    } catch (error: any) {
      debugTrace.push(`Firebase initialization failed: ${error.message}`)
      return NextResponse.json({ error: "Firestore not initialized", debugTrace }, { status: 500 })
    }

    const stripe = getStripe()

    const payload = await request.text()
    const sig = request.headers.get("stripe-signature")
    if (!sig) {
      debugTrace.push("Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header", debugTrace }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
      debugTrace.push(`Verified signature for event ${event.id} (${event.type})`)
    } catch (err: any) {
      debugTrace.push(`Signature verification failed: ${err.message}`)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}`, debugTrace },
        { status: 400 },
      )
    }

    // Store raw event for diagnostics (best-effort)
    try {
      await adminDb.collection("stripeWebhookEvents").add({
        eventType: event.type,
        eventId: event.id,
        receivedAt: new Date(),
        rawEvent: JSON.parse(payload),
        webhook: "webhook-handler-3",
      })
    } catch (e) {
      console.warn("Failed to store raw event:", e)
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        debugTrace.push(`Session ${session.id} metadata: ${JSON.stringify(metadata)}`)

        // Only process download purchases
        if (metadata.contentType === "download_purchase") {
          return await handleDownloadPurchase(session, debugTrace)
        } else {
          debugTrace.push(`Ignoring non-download purchase: ${metadata.contentType}`)
          return NextResponse.json({ received: true, debugTrace })
        }
      default:
        debugTrace.push(`No-op for event ${event.type}`)
        return NextResponse.json({ received: true, debugTrace })
    }
  } catch (error: any) {
    console.error("Webhook error:", error)
    debugTrace.push(`Webhook error: ${error.message}`)
    return NextResponse.json({ error: error?.message || "Unknown error", debugTrace }, { status: 500 })
  }
}
