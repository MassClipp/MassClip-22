import type { NextRequest } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  console.log(`🎯 [Webhook ${requestId}] Starting webhook processing`)
  console.log(`🔍 [Webhook ${requestId}] Environment check:`, {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretLength: endpointSecret?.length,
  })

  try {
    // Get raw body as buffer - this is critical for signature verification
    const buf = await req.arrayBuffer()
    const rawBody = Buffer.from(buf)
    const bodyString = rawBody.toString("utf8")

    // Get signature from headers
    const sig = req.headers.get("stripe-signature")

    console.log(`📝 [Webhook ${requestId}] Request details:`, {
      bodyLength: rawBody.length,
      bodyStringLength: bodyString.length,
      hasSignature: !!sig,
      signatureLength: sig?.length || 0,
      contentType: req.headers.get("content-type"),
      userAgent: req.headers.get("user-agent"),
    })

    if (!sig) {
      console.error(`❌ [Webhook ${requestId}] Missing Stripe signature header`)
      return new Response("Missing signature", { status: 400 })
    }

    let event: Stripe.Event

    try {
      // Use the raw buffer for signature verification
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
      console.log(`✅ [Webhook ${requestId}] Signature verified successfully`)
      console.log(`📋 [Webhook ${requestId}] Event details:`, {
        type: event.type,
        id: event.id,
        created: new Date(event.created * 1000).toISOString(),
        livemode: event.livemode,
      })
    } catch (err: any) {
      console.error(`❌ [Webhook ${requestId}] Signature verification failed:`, {
        error: err.message,
        type: err.type,
        code: err.code,
        bodyLength: rawBody.length,
        sigLength: sig.length,
        webhookSecretLength: endpointSecret.length,
        bodyPreview: bodyString.substring(0, 200),
        sigPreview: sig.substring(0, 100),
      })
      return new Response(`Webhook signature verification failed: ${err.message}`, {
        status: 400,
      })
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 [Webhook ${requestId}] Processing checkout session: ${session.id}`)
      console.log(`🔍 [Webhook ${requestId}] Session metadata:`, session.metadata)

      // Extract required metadata
      const creatorId = session.metadata?.creatorId
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

      console.log(`📋 [Webhook ${requestId}] Extracted data:`, {
        creatorId,
        bundleId,
        buyerUid,
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
      })

      if (!creatorId || !bundleId) {
        console.error(`❌ [Webhook ${requestId}] Missing required metadata:`, {
          creatorId,
          bundleId,
          buyerUid,
          allMetadata: session.metadata,
        })
        return new Response("Missing required metadata", { status: 400 })
      }

      // Check for duplicate processing
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ [Webhook ${requestId}] Purchase already processed: ${session.id}`)
        return new Response(
          JSON.stringify({
            received: true,
            message: "Already processed",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Get creator data
      console.log(`🔍 [Webhook ${requestId}] Looking up creator: ${creatorId}`)
      const creatorDoc = await db.collection("users").doc(creatorId).get()

      if (!creatorDoc.exists) {
        console.error(`❌ [Webhook ${requestId}] Creator not found: ${creatorId}`)
        return new Response("Creator not found", { status: 400 })
      }

      const creatorData = creatorDoc.data()!
      const creatorStripeAccountId = creatorData.stripeAccountId

      console.log(`👤 [Webhook ${requestId}] Creator found:`, {
        id: creatorId,
        name: creatorData.displayName || creatorData.name,
        hasStripeAccount: !!creatorStripeAccountId,
      })

      if (!creatorStripeAccountId) {
        console.error(`❌ [Webhook ${requestId}] Creator missing Stripe account: ${creatorId}`)
        return new Response("Creator Stripe account not found", { status: 400 })
      }

      // Verify session through connected account
      let verifiedSession: Stripe.Checkout.Session
      try {
        console.log(`🔍 [Webhook ${requestId}] Verifying session through connected account`)
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log(`✅ [Webhook ${requestId}] Session verified through connected account`)
      } catch (error: any) {
        console.error(`❌ [Webhook ${requestId}] Session verification failed:`, {
          error: error.message,
          sessionId: session.id,
          stripeAccount: creatorStripeAccountId,
        })
        return new Response("Session verification failed", { status: 400 })
      }

      // Get bundle data
      console.log(`🔍 [Webhook ${requestId}] Fetching bundle: ${bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error(`❌ [Webhook ${requestId}] Bundle not found: ${bundleId}`)
        return new Response("Bundle not found", { status: 400 })
      }

      const bundleData = bundleDoc.data()!
      const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

      console.log(`📦 [Webhook ${requestId}] Bundle content check:`, {
        title: bundleData.title,
        hasContent: !!bundleData.content,
        hasContentItems: !!bundleData.contentItems,
        hasVideos: !!bundleData.videos,
        contentLength: bundleContent.length,
      })

      if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
        console.error(`❌ [Webhook ${requestId}] No content in bundle: ${bundleId}`)
        return new Response("No bundle content found", { status: 400 })
      }

      // Format content for purchase record
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
        timestamp: FieldValue.serverTimestamp(),
        bundleContent: formattedBundleContent,
        webhookRequestId: requestId,
        amount: verifiedSession.amount_total,
        currency: verifiedSession.currency,
      }

      console.log(`💾 [Webhook ${requestId}] Creating purchase record`)
      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

      console.log(`✅ [Webhook ${requestId}] Purchase record created successfully`)
      console.log(`📊 [Webhook ${requestId}] Final summary:`, {
        sessionId: session.id,
        bundleId: bundleId,
        bundleTitle: bundleData.title,
        creatorId: creatorId,
        buyerUid: buyerUid,
        contentItems: formattedBundleContent.length,
        amount: verifiedSession.amount_total,
        currency: verifiedSession.currency,
      })

      return new Response(
        JSON.stringify({
          received: true,
          message: "Purchase processed successfully",
          purchaseId: session.id,
          contentItems: formattedBundleContent.length,
          requestId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Handle other event types
    console.log(`ℹ️ [Webhook ${requestId}] Unhandled event type: ${event.type}`)
    return new Response(
      JSON.stringify({
        received: true,
        message: `Event type ${event.type} received but not processed`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error: any) {
    console.error(`❌ [Webhook ${requestId}] Processing error:`, {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name,
    })

    return new Response(
      JSON.stringify({
        error: "Webhook processing failed",
        details: error.message,
        requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
