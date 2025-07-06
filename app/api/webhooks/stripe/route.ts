import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Determine which webhook secret to use based on the Stripe key being used
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const webhookSecret = isTestMode ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET_LIVE

    if (!webhookSecret) {
      const missingSecret = isTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      console.error(`❌ [Webhook] Missing ${missingSecret} environment variable`)
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    console.log(`🔍 [Webhook] Processing ${isTestMode ? "TEST" : "LIVE"} mode webhook`)

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Webhook] Signature verified for ${isTestMode ? "TEST" : "LIVE"} mode`)
    } catch (err) {
      console.error(`❌ [Webhook] Signature verification failed:`, err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`🎉 [Webhook] ${isTestMode ? "TEST" : "LIVE"} Checkout session completed:`, {
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      })

      // Extract required data from metadata
      const { productBoxId, buyerUid, creatorUid } = session.metadata || {}

      if (!productBoxId || !buyerUid) {
        console.error("❌ [Webhook] Missing required metadata:", { productBoxId, buyerUid })
        return NextResponse.json({ error: "Missing required metadata" }, { status: 400 })
      }

      try {
        // Get product box details
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (!productBoxDoc.exists) {
          console.error("❌ [Webhook] Product box not found:", productBoxId)
          return NextResponse.json({ error: "Product box not found" }, { status: 404 })
        }

        const productBoxData = productBoxDoc.data()!
        const purchaseAmount = session.amount_total ? session.amount_total / 100 : 0

        // Create purchase record in user's purchases collection
        const purchaseData = {
          productBoxId,
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          amount: purchaseAmount,
          currency: session.currency || "usd",
          status: "complete",
          creatorId: creatorUid || productBoxData.creatorId,
          itemTitle: productBoxData.title,
          itemDescription: productBoxData.description,
          thumbnailUrl: productBoxData.thumbnailUrl,
          purchasedAt: new Date(),
          isTestPurchase: isTestMode,
          customerEmail: session.customer_details?.email,
        }

        // Store purchase in user's purchases subcollection
        await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(purchaseData)

        console.log(`✅ [Webhook] Purchase recorded for user ${buyerUid}, product ${productBoxId}`)

        // Update product box sales stats
        await db
          .collection("productBoxes")
          .doc(productBoxId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(purchaseAmount),
            lastSaleAt: new Date(),
          })

        // Record sale for creator
        if (creatorUid || productBoxData.creatorId) {
          const creatorId = creatorUid || productBoxData.creatorId
          const platformFee = purchaseAmount * 0.05 // 5% platform fee
          const netAmount = purchaseAmount - platformFee

          await db
            .collection("users")
            .doc(creatorId)
            .collection("sales")
            .add({
              productBoxId,
              buyerUid,
              sessionId: session.id,
              amount: purchaseAmount,
              platformFee,
              netAmount,
              currency: session.currency || "usd",
              status: "complete",
              isTestSale: isTestMode,
              soldAt: new Date(),
            })

          // Update creator's total stats
          await db
            .collection("users")
            .doc(creatorId)
            .update({
              totalSales: db.FieldValue.increment(1),
              totalRevenue: db.FieldValue.increment(netAmount),
              lastSaleAt: new Date(),
            })

          console.log(`✅ [Webhook] Sale recorded for creator ${creatorId}`)
        }

        return NextResponse.json({
          received: true,
          mode: isTestMode ? "test" : "live",
          sessionId: session.id,
          purchaseRecorded: true,
        })
      } catch (dbError) {
        console.error("❌ [Webhook] Database error:", dbError)
        return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
      }
    }

    // Log other events but don't process them
    console.log(`ℹ️ [Webhook] ${isTestMode ? "TEST" : "LIVE"} Received unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
