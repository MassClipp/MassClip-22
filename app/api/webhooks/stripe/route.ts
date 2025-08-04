import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  try {
    console.log(`🎯 [Webhook ${requestId}] Starting webhook processing at ${new Date().toISOString()}`)

    // Log environment check
    console.log(`🔧 [Webhook ${requestId}] Environment check:`, {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
      stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "missing",
    })

    if (!webhookSecret) {
      console.error(`❌ [Webhook ${requestId}] STRIPE_WEBHOOK_SECRET not configured`)
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const body = await request.text()
    console.log(`📝 [Webhook ${requestId}] Request body length: ${body.length}`)

    const headersList = headers()
    const sig = headersList.get("stripe-signature")

    console.log(`🔍 [Webhook ${requestId}] Headers check:`, {
      hasSignature: !!sig,
      signatureLength: sig?.length || 0,
      userAgent: headersList.get("user-agent"),
      contentType: headersList.get("content-type"),
    })

    if (!sig) {
      console.error(`❌ [Webhook ${requestId}] No Stripe signature found`)
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      console.log(`🔐 [Webhook ${requestId}] Attempting signature verification...`)
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
      console.log(`✅ [Webhook ${requestId}] Signature verified successfully`)
    } catch (err: any) {
      console.error(`❌ [Webhook ${requestId}] Signature verification failed:`, {
        error: err.message,
        type: err.type,
        webhookSecretLength: webhookSecret.length,
        signatureLength: sig.length,
      })
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    console.log(`🎯 [Webhook ${requestId}] Processing event: ${event.type} (ID: ${event.id})`)
    console.log(`📊 [Webhook ${requestId}] Event details:`, {
      type: event.type,
      id: event.id,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
      account: event.account || "platform",
    })

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 [Webhook ${requestId}] Processing checkout session: ${session.id}`)
      console.log(`🔍 [Webhook ${requestId}] Session metadata:`, session.metadata)
      console.log(`💰 [Webhook ${requestId}] Session details:`, {
        id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
        mode: session.mode,
      })

      // STEP 1: Extract required metadata
      const creatorId = session.metadata?.creatorId
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

      console.log(`📋 [Webhook ${requestId}] Extracted metadata:`, {
        creatorId,
        bundleId,
        buyerUid,
        hasMetadata: !!session.metadata,
        metadataKeys: session.metadata ? Object.keys(session.metadata) : [],
      })

      if (!creatorId || !bundleId) {
        console.error(`❌ [Webhook ${requestId}] Missing required metadata:`, {
          creatorId,
          bundleId,
          buyerUid,
          metadata: session.metadata,
        })
        return NextResponse.json({ error: "Missing required metadata" }, { status: 400 })
      }

      console.log(
        `✅ [Webhook ${requestId}] Required metadata found - Creator: ${creatorId}, Bundle: ${bundleId}, Buyer: ${buyerUid}`,
      )

      // STEP 2: Check if purchase already exists (prevent duplicates)
      console.log(`🔍 [Webhook ${requestId}] Checking for existing purchase...`)
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ [Webhook ${requestId}] Purchase already exists for session: ${session.id}`)
        return NextResponse.json({ received: true, message: "Purchase already processed" })
      }

      // STEP 3: Get creator's Stripe account ID
      console.log(`🔍 [Webhook ${requestId}] Looking up creator: ${creatorId}`)
      const creatorDoc = await db.collection("users").doc(creatorId).get()

      if (!creatorDoc.exists) {
        console.error(`❌ [Webhook ${requestId}] Creator not found: ${creatorId}`)
        return NextResponse.json({ error: "Creator not found" }, { status: 400 })
      }

      const creatorData = creatorDoc.data()!
      const creatorStripeAccountId = creatorData.stripeAccountId

      console.log(`👤 [Webhook ${requestId}] Creator data:`, {
        id: creatorId,
        name: creatorData.displayName || creatorData.name,
        hasStripeAccount: !!creatorStripeAccountId,
        stripeAccountId: creatorStripeAccountId,
      })

      if (!creatorStripeAccountId) {
        console.error(`❌ [Webhook ${requestId}] Creator has no Stripe account: ${creatorId}`)
        return NextResponse.json({ error: "Creator Stripe account not found" }, { status: 400 })
      }

      console.log(`✅ [Webhook ${requestId}] Creator Stripe account found: ${creatorStripeAccountId}`)

      // STEP 4: Verify session through seller's connected Stripe account
      let verifiedSession: Stripe.Checkout.Session
      try {
        console.log(`🔍 [Webhook ${requestId}] Verifying session through connected account: ${creatorStripeAccountId}`)
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log(`✅ [Webhook ${requestId}] Session verified through connected account`)
        console.log(
          `💰 [Webhook ${requestId}] Verified amount: ${verifiedSession.amount_total} ${verifiedSession.currency}`,
        )
      } catch (error: any) {
        console.error(`❌ [Webhook ${requestId}] Failed to verify session through connected account:`, {
          error: error.message,
          type: error.type,
          code: error.code,
          sessionId: session.id,
          stripeAccount: creatorStripeAccountId,
        })
        return NextResponse.json({ error: "Session verification failed" }, { status: 400 })
      }

      // STEP 5: Get bundle with all content information
      console.log(`🔍 [Webhook ${requestId}] Fetching bundle: ${bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error(`❌ [Webhook ${requestId}] Bundle not found: ${bundleId}`)
        return NextResponse.json({ error: "Bundle not found" }, { status: 400 })
      }

      const bundleData = bundleDoc.data()!
      console.log(`✅ [Webhook ${requestId}] Bundle found: ${bundleData.title}`)
      console.log(`📦 [Webhook ${requestId}] Bundle structure:`, {
        title: bundleData.title,
        hasContent: !!bundleData.content,
        hasContentItems: !!bundleData.contentItems,
        hasVideos: !!bundleData.videos,
        contentLength: bundleData.content?.length || 0,
        contentItemsLength: bundleData.contentItems?.length || 0,
        videosLength: bundleData.videos?.length || 0,
        allKeys: Object.keys(bundleData),
      })

      // STEP 6: Extract bundle content directly from bundle document
      const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

      if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
        console.error(`❌ [Webhook ${requestId}] No content found in bundle: ${bundleId}`)
        console.log(`🔍 [Webhook ${requestId}] Bundle data keys:`, Object.keys(bundleData))
        console.log(
          `🔍 [Webhook ${requestId}] Bundle data sample:`,
          JSON.stringify(bundleData, null, 2).substring(0, 500),
        )
        return NextResponse.json({ error: "No bundle content found" }, { status: 400 })
      }

      // Format content to match required structure
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

      console.log(`📦 [Webhook ${requestId}] Processed ${formattedBundleContent.length} content items`)

      // STEP 7: Create purchase document with new structure
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
        processingTime: Date.now() - startTime,
        webhookRequestId: requestId,
      }

      console.log(`💾 [Webhook ${requestId}] Creating purchase document: bundlePurchases/${session.id}`)
      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

      const processingTime = Date.now() - startTime
      console.log(`✅ [Webhook ${requestId}] Purchase document created successfully in ${processingTime}ms`)
      console.log(`📊 [Webhook ${requestId}] Purchase summary:`, {
        sessionId: session.id,
        bundleId: bundleId,
        bundleTitle: bundleData.title,
        creatorId: creatorId,
        buyerUid: buyerUid,
        contentItems: formattedBundleContent.length,
        amount: verifiedSession.amount_total,
        currency: verifiedSession.currency,
        processingTime,
      })

      return NextResponse.json({
        received: true,
        message: "Purchase processed successfully",
        purchaseId: session.id,
        contentItems: formattedBundleContent.length,
        processingTime,
        requestId,
      })
    }

    // Handle other event types
    console.log(`ℹ️ [Webhook ${requestId}] Unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true, message: `Unhandled event type: ${event.type}` })
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`❌ [Webhook ${requestId}] Processing error after ${processingTime}ms:`, {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name,
    })
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
        requestId,
        processingTime,
      },
      { status: 500 },
    )
  }
}
