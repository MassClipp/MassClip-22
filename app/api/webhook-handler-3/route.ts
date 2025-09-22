import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.WEBHOOK_SECRET_KEY_2!

async function processDownloadPurchase(session: Stripe.Checkout.Session) {
  console.log(`🛒 [Download Webhook] Processing download purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { buyerUid, buyerEmail, downloadCount, contentType } = metadata

  // Verify this is a download purchase
  if (contentType !== "download_purchase") {
    console.log(`ℹ️ [Download Webhook] Skipping non-download purchase: ${contentType}`)
    return
  }

  if (!buyerUid) {
    throw new Error("Missing buyer UID in session metadata")
  }

  const downloadsToAdd = Number.parseInt(downloadCount || "0")
  if (downloadsToAdd <= 0) {
    throw new Error("Invalid download count in session metadata")
  }

  console.log(`📦 [Download Webhook] Download purchase details:`, {
    sessionId: session.id,
    buyerUid: buyerUid.substring(0, 8) + "...",
    downloadsToAdd,
    paymentStatus: session.payment_status,
  })

  // Add downloads to user account
  try {
    // Check if user is a member first
    const memberDoc = await adminDb.collection("memberships").doc(buyerUid).get()

    if (memberDoc.exists) {
      // User is a member - add to their monthly downloads
      const currentData = memberDoc.data()
      const currentDownloads = currentData?.monthlyDownloads || 0

      await adminDb
        .collection("memberships")
        .doc(buyerUid)
        .update({
          monthlyDownloads: currentDownloads + downloadsToAdd,
          lastDownloadPurchase: new Date(),
        })

      console.log(`✅ [Download Webhook] Added ${downloadsToAdd} downloads to member ${buyerUid}`)
    } else {
      // Check if user is a free user
      const freeUserDoc = await adminDb.collection("freeUsers").doc(buyerUid).get()

      if (freeUserDoc.exists) {
        const currentData = freeUserDoc.data()
        const currentDownloads = currentData?.monthlyDownloads || 0

        await adminDb
          .collection("freeUsers")
          .doc(buyerUid)
          .update({
            monthlyDownloads: currentDownloads + downloadsToAdd,
            lastDownloadPurchase: new Date(),
          })

        console.log(`✅ [Download Webhook] Added ${downloadsToAdd} downloads to free user ${buyerUid}`)
      } else {
        // Create new free user record with downloads
        await adminDb.collection("freeUsers").doc(buyerUid).set({
          email: buyerEmail,
          monthlyDownloads: downloadsToAdd,
          lastDownloadPurchase: new Date(),
          createdAt: new Date(),
        })

        console.log(`✅ [Download Webhook] Created new user ${buyerUid} with ${downloadsToAdd} downloads`)
      }
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
  } catch (error) {
    console.error(`❌ [Download Webhook] Failed to add downloads to user ${buyerUid}:`, error)
    throw error
  }

  console.log(`✅ [Download Webhook] Download purchase completed successfully: ${session.id}`)
}

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig) {
    console.error("❌ [Download Webhook] Missing signature.")
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
    console.error(`❌ [Download Webhook] Signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`✅ [Download Webhook] Received event: ${event.type} (${event.id})`)

  // Test Firebase connection
  try {
    await adminDb.collection("_test").limit(1).get()
  } catch (error) {
    console.error("❌ [Download Webhook] Firebase not accessible:", error)
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
      webhook: "webhook-handler-3",
    })
    .catch((error) => {
      console.error("Failed to store raw stripe event", error)
    })

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}

        // Only process download purchases
        if (metadata.contentType === "download_purchase") {
          await processDownloadPurchase(session)
        } else {
          console.log(`ℹ️ [Download Webhook] Ignoring non-download event: ${metadata.contentType}`)
        }
        break

      default:
        console.log(`ℹ️ [Download Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (error: any) {
    console.error(`❌ [Download Webhook] Handler failed for event ${event.type}:`, error)
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

export async function GET() {
  return NextResponse.json({ message: "Download webhook endpoint - POST only" }, { status: 405 })
}
