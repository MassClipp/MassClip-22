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

// Use live keys for production, test keys for development/preview
const isProduction = process.env.VERCEL_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"
const isPreview = process.env.VERCEL_ENV === "preview"

// For connected accounts webhook, always use live keys in production
const useTestKeys = isDevelopment || isPreview || !isProduction

// Select the appropriate Stripe secret key
const stripeSecretKey = useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY

// Fallback to regular key if test key is not available
const finalSecretKey = stripeSecretKey || process.env.STRIPE_SECRET_KEY

// Initialize Stripe with proper error handling
let stripe: Stripe
try {
  if (!finalSecretKey) {
    throw new Error("No Stripe secret key available")
  }
  stripe = new Stripe(finalSecretKey, {
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

    // Determine actual mode based on the key we're using
    const actuallyUsingTestMode = finalSecretKey?.startsWith("sk_test_")
    const actuallyUsingLiveMode = finalSecretKey?.startsWith("sk_live_")

    console.log(`🔍 [Webhook ${requestId}] Environment & Key Info:`, {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      intendedMode: useTestKeys ? "TEST" : "LIVE",
      actualMode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
      keyPrefix: finalSecretKey?.substring(0, 7),
      hasSignature: !!signature,
      signatureLength: signature?.length || 0,
      stripeAccount: stripeAccount || "platform",
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
      webhookUrl: request.url,
    })

    if (!signature) {
      console.error(`❌ [Webhook ${requestId}] No Stripe signature found`)
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Select the correct webhook secret based on actual key mode (not intended mode)
    let webhookSecret: string | undefined
    if (actuallyUsingTestMode) {
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
      console.log(`🔍 [Webhook ${requestId}] Using TEST webhook secret: ${!!webhookSecret}`)
    } else if (actuallyUsingLiveMode) {
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE
      console.log(`🔍 [Webhook ${requestId}] Using LIVE webhook secret: ${!!webhookSecret}`)
    } else {
      console.error(`❌ [Webhook ${requestId}] Unable to determine key mode from: ${finalSecretKey?.substring(0, 7)}`)
      return NextResponse.json({ error: "Unable to determine Stripe key mode" }, { status: 500 })
    }

    if (!webhookSecret) {
      const missingSecret = actuallyUsingTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      console.error(`❌ [Webhook ${requestId}] Missing ${missingSecret} environment variable`)
      return NextResponse.json(
        { error: `Webhook secret not configured for ${actuallyUsingTestMode ? "test" : "live"} mode` },
        { status: 500 },
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      console.log(
        `🔍 [Webhook ${requestId}] Verifying signature with ${actuallyUsingTestMode ? "TEST" : "LIVE"} secret`,
      )
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ [Webhook ${requestId}] Signature verified successfully`)
      console.log(`📋 [Webhook ${requestId}] Event type: ${event.type}, Event ID: ${event.id}`)
      console.log(`📋 [Webhook ${requestId}] Event created: ${new Date(event.created * 1000).toISOString()}`)
    } catch (err: any) {
      console.error(`❌ [Webhook ${requestId}] Signature verification failed:`, {
        error: err.message,
        type: err.type,
        statusCode: err.statusCode,
        webhookSecretLength: webhookSecret?.length,
        actualMode: actuallyUsingTestMode ? "TEST" : "LIVE",
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
      console.log(`🎉 [Webhook ${requestId}] Mode: ${actuallyUsingTestMode ? "TEST" : "LIVE"}`)

      // Log all metadata for debugging
      console.log(`🔍 [Webhook ${requestId}] Full session metadata:`, JSON.stringify(session.metadata, null, 2))

      // Extract required data from metadata
      const { bundleId, buyerUid, creatorUid, connectedAccountId } = session.metadata || {}

      console.log(`🔍 [Webhook ${requestId}] Extracted metadata:`, {
        bundleId,
        buyerUid,
        creatorUid,
        connectedAccountId,
      })

      if (!bundleId || !buyerUid) {
        console.error(`❌ [Webhook ${requestId}] Missing required metadata:`, {
          bundleId: !!bundleId,
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
        // Get bundle details
        console.log(`🔍 [Webhook ${requestId}] Fetching bundle: ${bundleId}`)
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()

        if (!bundleDoc.exists) {
          console.error(`❌ [Webhook ${requestId}] Bundle not found: ${bundleId}`)

          // Create a basic purchase record even if bundle is missing
          const basicPurchaseData = {
            bundleId,
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || "usd",
            status: "complete",
            itemTitle: "Unknown Bundle",
            purchasedAt: new Date(),
            isTestPurchase: actuallyUsingTestMode,
            customerEmail: session.customer_details?.email,
            stripeAccount: stripeAccount,
            connectedAccountId: connectedAccountId,
            error: "Bundle not found during webhook processing",
            webhookProcessedAt: new Date(),
            webhookEventId: event.id,
            webhookRequestId: requestId,
          }

          console.log(
            `💾 [Webhook ${requestId}] Saving basic purchase record to users/${buyerUid}/purchases/${bundleId}`,
          )
          await db.collection("users").doc(buyerUid).collection("purchases").doc(bundleId).set(basicPurchaseData)

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
            warning: "Bundle not found",
            sessionId: session.id,
            purchaseRecorded: true,
            processingTime: Date.now() - startTime,
            requestId,
          })
        }

        const bundleData = bundleDoc.data()!
        const purchaseAmount = session.amount_total ? session.amount_total / 100 : 0

        console.log(`📦 [Webhook ${requestId}] Bundle data:`, {
          title: bundleData.title,
          creatorId: bundleData.creatorId,
          price: bundleData.price,
        })

        // Create comprehensive purchase record
        const purchaseData = {
          bundleId,
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          amount: purchaseAmount,
          currency: session.currency || "usd",
          status: "complete",
          creatorId: creatorUid || bundleData.creatorId,
          itemTitle: bundleData.title || "Untitled Bundle",
          itemDescription: bundleData.description || "",
          thumbnailUrl: bundleData.customPreviewThumbnail || "",
          purchasedAt: new Date(),
          isTestPurchase: actuallyUsingTestMode,
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
          bundleId,
          sessionId: session.id,
          amount: purchaseAmount,
          title: purchaseData.itemTitle,
          isTestPurchase: actuallyUsingTestMode,
        })

        // Store purchase in user's purchases subcollection using bundleId as doc ID
        console.log(`💾 [Webhook ${requestId}] Saving to users/${buyerUid}/purchases/${bundleId}`)
        await db.collection("users").doc(buyerUid).collection("purchases").doc(bundleId).set(purchaseData)
        console.log(`✅ [Webhook ${requestId}] Purchase record saved: users/${buyerUid}/purchases/${bundleId}`)

        // ALSO store in a unified purchases collection for easier querying by session ID
        console.log(`💾 [Webhook ${requestId}] Saving to userPurchases/${buyerUid}/purchases/${session.id}`)
        await db.collection("userPurchases").doc(buyerUid).collection("purchases").doc(session.id).set(purchaseData)
        console.log(
          `✅ [Webhook ${requestId}] Unified purchase record saved: userPurchases/${buyerUid}/purchases/${session.id}`,
        )

        // Update bundle sales stats
        try {
          console.log(`📊 [Webhook ${requestId}] Updating bundle stats for: ${bundleId}`)
          await db
            .collection("bundles")
            .doc(bundleId)
            .update({
              totalSales: FieldValue.increment(1),
              totalRevenue: FieldValue.increment(purchaseAmount),
              lastSaleAt: new Date(),
            })
          console.log(`✅ [Webhook ${requestId}] Bundle stats updated`)
        } catch (updateError) {
          console.error(`❌ [Webhook ${requestId}] Failed to update bundle stats:`, updateError)
        }

        // Record sale for creator
        if (creatorUid || bundleData.creatorId) {
          try {
            const creatorId = creatorUid || bundleData.creatorId
            const platformFee = purchaseAmount * 0.05 // 5% platform fee
            const netAmount = purchaseAmount - platformFee

            console.log(`💰 [Webhook ${requestId}] Recording sale for creator: ${creatorId}`)
            await db
              .collection("users")
              .doc(creatorId)
              .collection("sales")
              .add({
                bundleId,
                buyerUid,
                sessionId: session.id,
                amount: purchaseAmount,
                platformFee,
                netAmount,
                currency: session.currency || "usd",
                status: "complete",
                isTestSale: actuallyUsingTestMode,
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
          mode: actuallyUsingTestMode ? "test" : "live",
          sessionId: session.id,
          purchaseRecorded: true,
          stripeAccount: stripeAccount,
          connectedAccountId: connectedAccountId,
          purchaseDocId: bundleId,
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
            bundleId: bundleId || "unknown",
            sessionId: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || "usd",
            status: "complete",
            itemTitle: "Purchase (Processing Error)",
            purchasedAt: new Date(),
            isTestPurchase: actuallyUsingTestMode,
            customerEmail: session.customer_details?.email,
            stripeAccount: stripeAccount,
            connectedAccountId: connectedAccountId,
            error: `Database error during webhook processing: ${dbError.message}`,
            webhookProcessedAt: new Date(),
            webhookEventId: event.id,
            webhookRequestId: requestId,
          }

          if (buyerUid && bundleId) {
            await db.collection("users").doc(buyerUid).collection("purchases").doc(bundleId).set(fallbackPurchaseData)

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
    console.log(
      `ℹ️ [Webhook ${requestId}] ${actuallyUsingTestMode ? "TEST" : "LIVE"} Received unhandled event type: ${event.type}`,
    )
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
  const finalSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  const actuallyUsingTestMode = finalSecretKey?.startsWith("sk_test_")

  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
    environment: actuallyUsingTestMode ? "test" : "live",
    webhookSecretConfigured: actuallyUsingTestMode
      ? !!process.env.STRIPE_WEBHOOK_SECRET_TEST
      : !!process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    endpoint: "/api/webhooks/stripe",
    expectedUrl: "https://massclip.pro/api/webhooks/stripe",
  })
}
