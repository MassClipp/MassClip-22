import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"
import { completeBundleSlotPurchase } from "@/lib/bundle-slots-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.WEBHOOK_SECRET_KEY_2!

async function processBundleSlotPurchase(session: Stripe.Checkout.Session) {
  console.log(`🛒 [Bundle Slot Webhook] Processing bundle slot purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { buyerUid, buyerEmail, bundleSlots, bundleTier, contentType } = metadata

  // Verify this is a bundle slot purchase
  if (contentType !== "bundle_slot_purchase") {
    console.log(`ℹ️ [Bundle Slot Webhook] Skipping non-bundle-slot purchase: ${contentType}`)
    return
  }

  if (!buyerUid) {
    throw new Error("Missing buyer UID in session metadata")
  }

  console.log(`📦 [Bundle Slot Webhook] Bundle slot purchase details:`, {
    sessionId: session.id,
    buyerUid: buyerUid.substring(0, 8) + "...",
    bundleSlots,
    bundleTier,
    paymentStatus: session.payment_status,
  })

  // Complete the bundle slot purchase using the service
  await completeBundleSlotPurchase(session.id, session.payment_intent as string)

  console.log(`✅ [Bundle Slot Webhook] Bundle slot purchase completed successfully: ${session.id}`)
}

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig) {
    console.error("❌ [Bundle Slot Webhook] Missing signature.")
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
    console.error(`❌ [Bundle Slot Webhook] Signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`✅ [Bundle Slot Webhook] Received event: ${event.type} (${event.id})`)

  // Test Firebase connection
  try {
    await adminDb.collection("_test").limit(1).get()
  } catch (error) {
    console.error("❌ [Bundle Slot Webhook] Firebase not accessible:", error)
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
      webhook: "webhook-handler-2",
    })
    .catch((error) => {
      console.error("Failed to store raw stripe event", error)
    })

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}

        // Only process bundle slot purchases
        if (metadata.contentType === "bundle_slot_purchase") {
          await processBundleSlotPurchase(session)
        } else {
          console.log(`ℹ️ [Bundle Slot Webhook] Ignoring non-bundle-slot event: ${metadata.contentType}`)
        }
        break

      default:
        console.log(`ℹ️ [Bundle Slot Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (error: any) {
    console.error(`❌ [Bundle Slot Webhook] Handler failed for event ${event.type}:`, error)
    return NextResponse.json(
      {
        error: "Webhook handler failed",
        details: error.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
