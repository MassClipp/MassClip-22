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
    console.log("✅ [Webhook] Firebase Admin initialized")
  } catch (error) {
    console.error("❌ [Webhook] Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")
    const stripeAccount = request.headers.get("stripe-account")
    const userAgent = request.headers.get("user-agent")

    console.log("🔍 [Webhook] === INCOMING WEBHOOK REQUEST ===")
    console.log("🔍 [Webhook] Headers:", {
      hasSignature: !!signature,
      stripeAccount: stripeAccount || "platform",
      userAgent: userAgent?.substring(0, 50) + "...",
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    })

    if (!signature) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Determine which webhook secret to use based on the Stripe key being used
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const webhookSecret = isTestMode ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET_LIVE

    console.log(`🔍 [Webhook] Environment: ${isTestMode ? "TEST" : "LIVE"}`)
    console.log(`🔍 [Webhook] Webhook secret available: ${!!webhookSecret}`)

    if (!webhookSecret) {
      const missingSecret = isTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      console.error(`❌ [Webhook] Missing ${missingSecret} environment variable`)
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Webhook] Signature verified for ${isTestMode ? "TEST" : "LIVE"} mode`)
      console.log(`📋 [Webhook] Event type: ${event.type}, Event ID: ${event.id}`)
      console.log(`📋 [Webhook] Event created: ${new Date(event.created * 1000).toISOString()}`)
    } catch (err) {
      console.error(`❌ [Webhook] Signature verification failed:`, err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`🎉 [Webhook] === CHECKOUT SESSION COMPLETED ===`)
      console.log(`🎉 [Webhook] Session ID: ${session.id}`)
      console.log(`🎉 [Webhook] Payment Status: ${session.payment_status}`)
      console.log(`🎉 [Webhook] Amount: ${session.amount_total} ${session.currency}`)
      console.log(`🎉 [Webhook] Customer Email: ${session.customer_details?.email}`)
      console.log(`🎉 [Webhook] Connected Account: ${stripeAccount || "platform"}`)
      console.log(`🎉 [Webhook] Metadata:`, session.metadata)

      // Extract required data from metadata
      const { productBoxId, buyerUid, creatorUid, connectedAccountId } = session.metadata || {}

      console.log(`🔍 [Webhook] Extracted metadata:`, {
        productBoxId,
        buyerUid,
        creatorUid,
        connectedAccountId,
      })

      if (!productBoxId || !buyerUid) {
        console.error("❌ [Webhook] Missing required metadata:", { productBoxId, buyerUid })
        console.error("❌ [Webhook] Full session metadata:", session.metadata)

        // Still return success to Stripe to avoid retries, but log the issue
        return NextResponse.json({
          received: true,
          error: "Missing metadata",
          sessionId: session.id,
          timestamp: new Date().toISOString(),
        })
      }

      // Verify the connected account matches
      if (stripeAccount && connectedAccountId && stripeAccount !== connectedAccountId) {
        console.warn("⚠️ [Webhook] Connected account mismatch:", {
          headerAccount: stripeAccount,
          metadataAccount: connectedAccountId,
        })
      }

      try {
        // Get product box details
        console.log(`🔍 [Webhook] Fetching product box: ${productBoxId}`)
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
            connectedAccountId: connectedAccountId,
            error: "Product box not found during webhook processing",
            webhookProcessedAt: new Date(),
            webhookEventId: event.id,
          }

          console.log(`💾 [Webhook] Saving basic purchase record to users/${buyerUid}/purchases/${productBoxId}`)
          await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(basicPurchaseData)

          console.log(`💾 [Webhook] Saving basic purchase record to userPurchases/${buyerUid}/purchases/${session.id}`)
          await db
            .collection("userPurchases")
            .doc(buyerUid)
            .collection("purchases")
            .doc(session.id)
            .set(basicPurchaseData)

          console.log(`✅ [Webhook] Basic purchase records saved for user ${buyerUid}`)

          return NextResponse.json({
            received: true,
            warning: "Product box not found",
            sessionId: session.id,
            purchaseRecorded: true,
            processingTime: Date.now() - startTime,
          })
        }

        const productBoxData = productBoxDoc.data()!
        const purchaseAmount = session.amount_total ? session.amount_total / 100 : 0

        console.log(`📦 [Webhook] Product box data:`, {
          title: productBoxData.title,
          creatorId: productBoxData.creatorId,
          price: productBoxData.price,
        })

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
          connectedAccountId: connectedAccountId,
          webhookProcessedAt: new Date(),
          webhookEventId: event.id,
        }

        console.log(`💾 [Webhook] === SAVING PURCHASE RECORDS ===`)
        console.log(`💾 [Webhook] Purchase data:`, {
          userId: buyerUid,
          productBoxId,
          sessionId: session.id,
          amount: purchaseAmount,
          title: purchaseData.itemTitle,
        })

        // Store purchase in user's purchases subcollection using productBoxId as doc ID
        console.log(`💾 [Webhook] Saving to users/${buyerUid}/purchases/${productBoxId}`)
        await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(purchaseData)
        console.log(`✅ [Webhook] Purchase record saved: users/${buyerUid}/purchases/${productBoxId}`)

        // ALSO store in a unified purchases collection for easier querying by session ID
        console.log(`💾 [Webhook] Saving to userPurchases/${buyerUid}/purchases/${session.id}`)
        await db.collection("userPurchases").doc(buyerUid).collection("purchases").doc(session.id).set(purchaseData)
        console.log(`✅ [Webhook] Unified purchase record saved: userPurchases/${buyerUid}/purchases/${session.id}`)

        // Update product box sales stats
        try {
          console.log(`📊 [Webhook] Updating product box stats for: ${productBoxId}`)
          await db
            .collection("productBoxes")
            .doc(productBoxId)
            .update({
              totalSales: FieldValue.increment(1),
              totalRevenue: FieldValue.increment(purchaseAmount),
              lastSaleAt: new Date(),
            })
          console.log(`✅ [Webhook] Product box stats updated`)
        } catch (updateError) {
          console.error("❌ [Webhook] Failed to update product box stats:", updateError)
        }

        // Record sale for creator
        if (creatorUid || productBoxData.creatorId) {
          try {
            const creatorId = creatorUid || productBoxData.creatorId
            const platformFee = purchaseAmount * 0.05 // 5% platform fee
            const netAmount = purchaseAmount - platformFee

            console.log(`💰 [Webhook] Recording sale for creator: ${creatorId}`)
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
                connectedAccountId: connectedAccountId,
                soldAt: new Date(),
                webhookEventId: event.id,
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

        console.log(`🎉 [Webhook] === PURCHASE PROCESSING COMPLETED SUCCESSFULLY ===`)
        console.log(`🎉 [Webhook] Processing time: ${Date.now() - startTime}ms`)

        return NextResponse.json({
          received: true,
          mode: isTestMode ? "test" : "live",
          sessionId: session.id,
          purchaseRecorded: true,
          stripeAccount: stripeAccount,
          connectedAccountId: connectedAccountId,
          purchaseDocId: productBoxId,
          unifiedDocId: session.id,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
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
            connectedAccountId: connectedAccountId,
            error: "Database error during webhook processing",
            webhookProcessedAt: new Date(),
            webhookEventId: event.id,
          }

          if (buyerUid && productBoxId) {
            await db
              .collection("users")
              .doc(buyerUid)
              .collection("purchases")
              .doc(productBoxId)
              .set(fallbackPurchaseData)

            // Also save to unified collection
            await db
              .collection("userPurchases")
              .doc(buyerUid)
              .collection("purchases")
              .doc(session.id)
              .set(fallbackPurchaseData)

            console.log(`⚠️ [Webhook] Fallback purchase records created`)
          }
        } catch (fallbackError) {
          console.error("❌ [Webhook] Fallback purchase creation failed:", fallbackError)
        }

        return NextResponse.json({
          received: true,
          error: "Database error",
          sessionId: session.id,
          processingTime: Date.now() - startTime,
        })
      }
    }

    // Log other events but don't process them
    console.log(`ℹ️ [Webhook] ${isTestMode ? "TEST" : "LIVE"} Received unhandled event type: ${event.type}`)
    return NextResponse.json({
      received: true,
      eventType: event.type,
      processingTime: Date.now() - startTime,
    })
  } catch (error) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: (error as Error).message,
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}

// Handle GET requests (for webhook endpoint verification)
export async function GET() {
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
    environment: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "live",
  })
}
