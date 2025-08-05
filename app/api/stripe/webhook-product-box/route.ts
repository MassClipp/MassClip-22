import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error("❌ [Stripe Webhook] Signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`🔍 [Stripe Webhook] Processing event: ${event.type}`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.type === "product_box_purchase") {
          await handleProductBoxPurchase(session)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription && invoice.metadata?.type === "product_box_purchase") {
          await handleSubscriptionPayment(invoice)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        if (subscription.metadata?.type === "product_box_purchase") {
          await handleSubscriptionCancellation(subscription)
        }
        break
      }

      default:
        console.log(`🔍 [Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] Error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleProductBoxPurchase(session: Stripe.Checkout.Session) {
  try {
    const { productBoxId, creatorId, buyerUid } = session.metadata!
    const customerId = session.customer as string
    const customerEmail = session.customer_details?.email

    console.log(`🔍 [Product Box Purchase] Processing purchase for product box: ${productBoxId}`)

    // Create purchase record with consistent structure
    const purchaseData = {
      // Primary identifiers
      productBoxId,
      itemId: productBoxId, // For consistency with video purchases
      creatorId,
      buyerUid,

      // Purchase details
      type: "product_box",
      amount: session.amount_total! / 100, // Convert from cents
      currency: session.currency,
      status: "completed",

      // Stripe details
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      subscriptionId: session.subscription || null,

      // Customer info
      buyerEmail: customerEmail,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save purchase record
    const purchaseRef = await db.collection("purchases").add(purchaseData)
    console.log(`✅ [Product Box Purchase] Purchase recorded with ID: ${purchaseRef.id}`)

    // Grant access to the content by creating access record
    if (buyerUid) {
      const accessData = {
        userId: buyerUid,
        productBoxId,
        purchaseId: purchaseRef.id,
        grantedAt: new Date(),
        grantedBy: "purchase",
        type: "product_box",
        status: "active",
      }

      await db.collection("userAccess").add(accessData)
      console.log(`✅ [Product Box Purchase] Access granted to user: ${buyerUid}`)

      // Also grant access to individual videos in the product box
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      const productBoxData = productBoxDoc.data()

      if (productBoxData?.contentItems?.length > 0) {
        const batch = db.batch()

        for (const videoId of productBoxData.contentItems) {
          const videoAccessRef = db.collection("userAccess").doc(`${buyerUid}_${videoId}`)
          batch.set(videoAccessRef, {
            userId: buyerUid,
            videoId,
            productBoxId,
            purchaseId: purchaseRef.id,
            grantedAt: new Date(),
            grantedBy: "product_box_purchase",
            type: "video",
            status: "active",
          })
        }

        await batch.commit()
        console.log(`✅ [Product Box Purchase] Granted access to ${productBoxData.contentItems.length} videos`)
      }
    }

    console.log(`✅ [Product Box Purchase] Purchase processed successfully`)
  } catch (error) {
    console.error("❌ [Product Box Purchase] Error:", error)
  }
}

async function handleSubscriptionPayment(invoice: Stripe.Invoice) {
  try {
    console.log(`🔍 [Subscription Payment] Processing payment for subscription: ${invoice.subscription}`)

    // Handle recurring subscription payments
    // This ensures continued access for subscription-based product boxes
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

    if (subscription.metadata?.productBoxId && subscription.metadata?.buyerUid) {
      // Update access record to extend subscription
      const accessQuery = await db
        .collection("userAccess")
        .where("userId", "==", subscription.metadata.buyerUid)
        .where("productBoxId", "==", subscription.metadata.productBoxId)
        .where("type", "==", "product_box")
        .limit(1)
        .get()

      if (!accessQuery.empty) {
        await accessQuery.docs[0].ref.update({
          lastPaymentAt: new Date(),
          status: "active",
        })
      }
    }

    console.log(`✅ [Subscription Payment] Payment processed successfully`)
  } catch (error) {
    console.error("❌ [Subscription Payment] Error:", error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const { productBoxId, buyerUid } = subscription.metadata!

    console.log(`🔍 [Subscription Cancellation] Processing cancellation for product box: ${productBoxId}`)

    // Revoke access for cancelled subscriptions
    if (buyerUid && productBoxId) {
      // Update access status
      const accessQuery = await db
        .collection("userAccess")
        .where("userId", "==", buyerUid)
        .where("productBoxId", "==", productBoxId)
        .where("type", "==", "product_box")
        .limit(1)
        .get()

      if (!accessQuery.empty) {
        await accessQuery.docs[0].ref.update({
          status: "cancelled",
          cancelledAt: new Date(),
        })
      }

      // Also revoke access to individual videos
      const videoAccessQuery = await db
        .collection("userAccess")
        .where("userId", "==", buyerUid)
        .where("productBoxId", "==", productBoxId)
        .where("type", "==", "video")
        .get()

      const batch = db.batch()
      videoAccessQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: new Date(),
        })
      })
      await batch.commit()

      // Update purchase record
      const purchaseQuery = await db
        .collection("purchases")
        .where("buyerUid", "==", buyerUid)
        .where("productBoxId", "==", productBoxId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!purchaseQuery.empty) {
        await purchaseQuery.docs[0].ref.update({
          status: "cancelled",
          cancelledAt: new Date(),
        })
      }
    }

    console.log(`✅ [Subscription Cancellation] Cancellation processed successfully`)
  } catch (error) {
    console.error("❌ [Subscription Cancellation] Error:", error)
  }
}
