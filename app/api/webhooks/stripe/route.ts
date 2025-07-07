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

// Initialize Stripe with proper error handling
let stripe: Stripe
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set")
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  })
} catch (error) {
  console.error("❌ [Webhook] Failed to initialize Stripe:", error)
  throw error
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  try {
    console.log(`🔍 [Webhook ${requestId}] === INCOMING WEBHOOK REQUEST ===`)

    const body = await request.text()
    const signature = request.headers.get("stripe-signature")
    const stripeAccount = request.headers.get("stripe-account")
    const userAgent = request.headers.get("user-agent")

    console.log(`🔍 [Webhook ${requestId}] Headers:`, {
      hasSignature: !!signature,
      signatureLength: signature?.length || 0,
      stripeAccount: stripeAccount || "platform",
      userAgent: userAgent?.substring(0, 50) + "...",
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    })

    if (!signature) {
      console.error(`❌ [Webhook ${requestId}] No Stripe signature found`)
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Determine environment and select appropriate webhook secret
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")

    console.log(`🔍 [Webhook ${requestId}] Environment detection:`, {
      isTestMode,
      isLiveMode,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
    })

    // Select the correct webhook secret based on environment
    let webhookSecret: string | undefined
    if (isTestMode) {
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
      console.log(`🔍 [Webhook ${requestId}] Using TEST webhook secret: ${!!webhookSecret}`)
    } else if (isLiveMode) {
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE
      console.log(`🔍 [Webhook ${requestId}] Using LIVE webhook secret: ${!!webhookSecret}`)
    } else {
      console.error(`❌ [Webhook ${requestId}] Unable to determine environment from Stripe key`)
      return NextResponse.json({ error: "Unable to determine Stripe environment" }, { status: 500 })
    }

    if (!webhookSecret) {
      const missingSecret = isTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      console.error(`❌ [Webhook ${requestId}] Missing ${missingSecret} environment variable`)
      return NextResponse.json(
        { error: `Webhook secret not configured for ${isTestMode ? "test" : "live"} mode` },
        { status: 500 },
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      console.log(`🔍 [Webhook ${requestId}] Verifying signature with ${isTestMode ? "TEST" : "LIVE"} secret`)
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Webhook ${requestId}] Signature verified successfully`)
      console.log(`📋 [Webhook ${requestId}] Event type: ${event.type}, Event ID: ${event.id}`)
      console.log(`📋 [Webhook ${requestId}] Event created: ${new Date(event.created * 1000).toISOString()}`)
    } catch (err: any) {
      console.error(`❌ [Webhook ${requestId}] Signature verification failed:`, {
        error: err.message,
        type: err.type,
        statusCode: err.statusCode,
      })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`🎉 [Webhook ${requestId}] === CHECKOUT SESSION COMPLETED ===`)
      console.log(`🎉 [Webhook ${requestId}] Session ID: ${session.id}`)
      console.log(`🎉 [Webhook ${requestId}] Payment Status: ${session.payment_status}`)
      console.log(`🎉 [Webhook ${requestId}] Amount: ${session.amount_total} ${session.currency}`)
      console.log(`🎉 [Webhook ${requestId}] Customer Email: ${session.customer_details?.email}`)
      console.log(`🎉 [Webhook ${requestId}] Connected Account: ${stripeAccount || "platform"}`)
      console.log(`🎉 [Webhook ${requestId}] Mode: ${isTestMode ? "TEST" : "LIVE"}`)

      // Log all metadata for debugging
      console.log(`🔍 [Webhook ${requestId}] Full session metadata:`, JSON.stringify(session.metadata, null, 2))

      // Extract required data from metadata
      const { productBoxId, buyerUid, creatorUid, connectedAccountId } = session.metadata || {}

      console.log(`🔍 [Webhook ${requestId}] Extracted metadata:`, {
        productBoxId,
        buyerUid,
        creatorUid,
        connectedAccountId,
      })

      if (!productBoxId || !buyerUid) {
        console.error(`❌ [Webhook ${requestId}] Missing required metadata:`, {
          productBoxId: !!productBoxId,
          buyerUid: !!buyerUid,
          allMetadata: session.metadata,
        })

        // Still return success to Stripe to avoid retries, but log the issue
        return NextResponse.json({
          received: true,
          error: "Missing required metadata",
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          requestId,
        })
      }

      // Verify the connected account matches if both are present
      if (stripeAccount && connectedAccountId && stripeAccount !== connectedAccountId) {
        console.warn(`⚠️ [Webhook ${requestId}] Connected account mismatch:`, {
          headerAccount: stripeAccount,
          metadataAccount: connectedAccountId,
        })
      }

      try {
        // Get product box details
        console.log(`🔍 [Webhook ${requestId}] Fetching product box: ${productBoxId}`)
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

        if (!productBoxDoc.exists) {
          console.error(`❌ [Webhook ${requestId}] Product box not found: ${productBoxId}`)

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
            webhookRequestId: requestId,
          }

          console.log(
            `💾 [Webhook ${requestId}] Saving basic purchase record to users/${buyerUid}/purchases/${productBoxId}`,
          )
          await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(basicPurchaseData)

          console.log(
            `💾 [Webhook ${requestId}] Saving basic purchase record to userPurchases/${buyerUid}/purchases/${session.id}`,
          )
          await db
            .collection("userPurchases")
            .doc(buyerUid)
            .collection("purchases")
            .doc(session.id)
            .set(basicPurchaseData)

          console.log(`✅ [Webhook ${requestId}] Basic purchase records saved for user ${buyerUid}`)

          return NextResponse.json({
            received: true,
            warning: "Product box not found",
            sessionId: session.id,
            purchaseRecorded: true,
            processingTime: Date.now() - startTime,
            requestId,
          })
        }

        const productBoxData = productBoxDoc.data()!
        const purchaseAmount = session.amount_total ? session.amount_total / 100 : 0

        console.log(`📦 [Webhook ${requestId}] Product box data:`, {
          title: productBoxData.title,
          creatorId: productBoxData.creatorId,
          price: productBoxData.price,
        })

        // Create comprehensive purchase record
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
          webhookRequestId: requestId,
          paymentStatus: session.payment_status,
        }

        console.log(`💾 [Webhook ${requestId}] === SAVING PURCHASE RECORDS ===`)
        console.log(`💾 [Webhook ${requestId}] Purchase data summary:`, {
          userId: buyerUid,
          productBoxId,
          sessionId: session.id,
          amount: purchaseAmount,
          title: purchaseData.itemTitle,
          isTestPurchase: isTestMode,
        })

        // Store purchase in user's purchases subcollection using productBoxId as doc ID
        console.log(`💾 [Webhook ${requestId}] Saving to users/${buyerUid}/purchases/${productBoxId}`)
        await db.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId).set(purchaseData)
        console.log(`✅ [Webhook ${requestId}] Purchase record saved: users/${buyerUid}/purchases/${productBoxId}`)

        // ALSO store in a unified purchases collection for easier querying by session ID
        console.log(`💾 [Webhook ${requestId}] Saving to userPurchases/${buyerUid}/purchases/${session.id}`)
        await db.collection("userPurchases").doc(buyerUid).collection("purchases").doc(session.id).set(purchaseData)
        console.log(
          `✅ [Webhook ${requestId}] Unified purchase record saved: userPurchases/${buyerUid}/purchases/${session.id}`,
        )

        // Update product box sales stats
        try {
          console.log(`📊 [Webhook ${requestId}] Updating product box stats for: ${productBoxId}`)
          await db
            .collection("productBoxes")
            .doc(productBoxId)
            .update({
              totalSales: FieldValue.increment(1),
              totalRevenue: FieldValue.increment(purchaseAmount),
              lastSaleAt: new Date(),
            })
          console.log(`✅ [Webhook ${requestId}] Product box stats updated`)
        } catch (updateError) {
          console.error(`❌ [Webhook ${requestId}] Failed to update product box stats:`, updateError)
        }

        // Record sale for creator
        if (creatorUid || productBoxData.creatorId) {
          try {
            const creatorId = creatorUid || productBoxData.creatorId
            const platformFee = purchaseAmount * 0.05 // 5% platform fee
            const netAmount = purchaseAmount - platformFee

            console.log(`💰 [Webhook ${requestId}] Recording sale for creator: ${creatorId}`)
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
                webhookRequestId: requestId,
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

            console.log(`✅ [Webhook ${requestId}] Sale recorded for creator ${creatorId}`)
          } catch (creatorError) {
            console.error(`❌ [Webhook ${requestId}] Failed to record creator sale:`, creatorError)
          }
        }

        console.log(`🎉 [Webhook ${requestId}] === PURCHASE PROCESSING COMPLETED SUCCESSFULLY ===`)
        console.log(`🎉 [Webhook ${requestId}] Processing time: ${Date.now() - startTime}ms`)

        // Return success response to Stripe
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
          requestId,
        })
      } catch (dbError: any) {
        console.error(`❌ [Webhook ${requestId}] Database error:`, dbError)

        // Try to create a minimal purchase record as fallback
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
            error: `Database error during webhook processing: ${dbError.message}`,
            webhookProcessedAt: new Date(),
            webhookEventId: event.id,
            webhookRequestId: requestId,
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

            console.log(`⚠️ [Webhook ${requestId}] Fallback purchase records created`)
          }
        } catch (fallbackError) {
          console.error(`❌ [Webhook ${requestId}] Fallback purchase creation failed:`, fallbackError)
        }

        // Still return success to Stripe to avoid retries
        return NextResponse.json({
          received: true,
          error: "Database error",
          sessionId: session.id,
          processingTime: Date.now() - startTime,
          requestId,
        })
      }
    }

    // Log other events but don't process them
    console.log(`ℹ️ [Webhook ${requestId}] ${isTestMode ? "TEST" : "LIVE"} Received unhandled event type: ${event.type}`)
    return NextResponse.json({
      received: true,
      eventType: event.type,
      processingTime: Date.now() - startTime,
      requestId,
    })
  } catch (error: any) {
    console.error(`❌ [Webhook ${requestId}] Error processing webhook:`, {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
    })

    // Return 500 to trigger Stripe retry
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
        processingTime: Date.now() - startTime,
        requestId,
      },
      { status: 500 },
    )
  }
}

// Handle GET requests (for webhook endpoint verification)
export async function GET() {
  const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
    environment: isTestMode ? "test" : "live",
    webhookSecretConfigured: isTestMode
      ? !!process.env.STRIPE_WEBHOOK_SECRET_TEST
      : !!process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  })
}
