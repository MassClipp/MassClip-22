import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
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
    console.log("✅ Firebase Admin initialized")
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")
    const stripeAccount = request.headers.get("stripe-account")

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
    console.log(`🔗 [Webhook] Stripe Account: ${stripeAccount || "platform"}`)

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
        stripeAccount: stripeAccount,
      })

      // Extract required data from metadata
      const { productBoxId, buyerUid, creatorUid } = session.metadata || {}

      if (!productBoxId || !buyerUid) {
        console.error("❌ [Webhook] Missing required metadata:", { productBoxId, buyerUid })

        // Still return success to Stripe to avoid retries, but log the issue
        return NextResponse.json({
          received: true,
          error: "Missing metadata",
          sessionId: session.id,
        })
      }

      try {
        // Get product box details
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        if (!productBoxDoc.exists) {
          console.error("❌ [Webhook] Product box not found:", productBoxId)

          // Create a basic purchase record even if product box is missing
          const basicPurchaseData = {
            productBoxId,
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || "usd",
            status: "complete",
            itemTitle: "Unknown Product",
            purchasedAt: new Date(),
            isTestPurchase: isTestMode,
            customerEmail: session.customer_details?.email,
            stripeAccount: stripeAccount,
            error: "Product box not found during webhook processing",
          }

          await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(basicPurchaseData)

          return NextResponse.json({
            received: true,
            warning: "Product box not found",
            sessionId: session.id,
            purchaseRecorded: true,
          })
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
          itemTitle: productBoxData.title || "Untitled Product",
          itemDescription: productBoxData.description || "",
          thumbnailUrl: productBoxData.thumbnailUrl || "",
          purchasedAt: new Date(),
          isTestPurchase: isTestMode,
          customerEmail: session.customer_details?.email,
          stripeAccount: stripeAccount,
          webhookProcessedAt: new Date(),
        }

        // Store purchase in user's purchases subcollection
        await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(purchaseData)

        console.log(`✅ [Webhook] Purchase recorded for user ${buyerUid}, product ${productBoxId}`)

        // Update product box sales stats
        try {
          await db
            .collection("productBoxes")
            .doc(productBoxId)
            .update({
              totalSales: FieldValue.increment(1),
              totalRevenue: FieldValue.increment(purchaseAmount),
              lastSaleAt: new Date(),
            })
        } catch (updateError) {
          console.error("❌ [Webhook] Failed to update product box stats:", updateError)
        }

        // Record sale for creator
        if (creatorUid || productBoxData.creatorId) {
          try {
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
                stripeAccount: stripeAccount,
                soldAt: new Date(),
              })

            // Update creator's total stats
            await db
              .collection("users")
              .doc(creatorId)
              .update({
                totalSales: FieldValue.increment(1),
                totalRevenue: FieldValue.increment(netAmount),
                lastSaleAt: new Date(),
              })

            console.log(`✅ [Webhook] Sale recorded for creator ${creatorId}`)
          } catch (creatorError) {
            console.error("❌ [Webhook] Failed to record creator sale:", creatorError)
          }
        }

        return NextResponse.json({
          received: true,
          mode: isTestMode ? "test" : "live",
          sessionId: session.id,
          purchaseRecorded: true,
          stripeAccount: stripeAccount,
        })
      } catch (dbError) {
        console.error("❌ [Webhook] Database error:", dbError)

        // Try to create a minimal purchase record
        try {
          const fallbackPurchaseData = {
            productBoxId: productBoxId || "unknown",
            sessionId: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || "usd",
            status: "complete",
            itemTitle: "Purchase (Processing Error)",
            purchasedAt: new Date(),
            isTestPurchase: isTestMode,
            customerEmail: session.customer_details?.email,
            stripeAccount: stripeAccount,
            error: "Database error during webhook processing",
          }

          if (buyerUid && productBoxId) {
            await db
              .collection("users")
              .doc(buyerUid)
              .collection("purchases")
              .doc(productBoxId)
              .set(fallbackPurchaseData)
            console.log(`⚠️ [Webhook] Fallback purchase record created`)
          }
        } catch (fallbackError) {
          console.error("❌ [Webhook] Fallback purchase creation failed:", fallbackError)
        }

        return NextResponse.json({
          received: true,
          error: "Database error",
          sessionId: session.id,
        })
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

// Handle GET requests (for webhook endpoint verification)
export async function GET() {
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
