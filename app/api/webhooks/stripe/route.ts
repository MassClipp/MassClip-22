import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  console.log(`🎯 [Webhook ${requestId}] Starting webhook processing`)

  try {
    // Get the raw body - this is critical for signature verification
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    console.log(`📝 [Webhook ${requestId}] Body length: ${body.length}, Has signature: ${!!sig}`)

    if (!sig) {
      console.error(`❌ [Webhook ${requestId}] No Stripe signature header`)
      return new NextResponse('No signature', { status: 400 })
    }

    let event: Stripe.Event

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log(`✅ [Webhook ${requestId}] Signature verified for event: ${event.type}`)
    } catch (err: any) {
      console.error(`❌ [Webhook ${requestId}] Signature verification failed: ${err.message}`)
      console.error(`🔍 [Webhook ${requestId}] Debug info:`, {
        bodyLength: body.length,
        sigLength: sig?.length,
        endpointSecretLength: endpointSecret?.length,
        bodyPreview: body.substring(0, 100),
        sigPreview: sig?.substring(0, 50),
      })
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 [Webhook ${requestId}] Processing session: ${session.id}`)
      console.log(`🔍 [Webhook ${requestId}] Session metadata:`, session.metadata)

      // Extract metadata
      const creatorId = session.metadata?.creatorId
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

      if (!creatorId || !bundleId) {
        console.error(`❌ [Webhook ${requestId}] Missing metadata:`, {
          creatorId,
          bundleId,
          buyerUid,
          allMetadata: session.metadata
        })
        return new NextResponse('Missing required metadata', { status: 400 })
      }

      // Check for duplicate processing
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ [Webhook ${requestId}] Purchase already exists: ${session.id}`)
        return new NextResponse('Already processed', { status: 200 })
      }

      // Get creator data
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (!creatorDoc.exists) {
        console.error(`❌ [Webhook ${requestId}] Creator not found: ${creatorId}`)
        return new NextResponse('Creator not found', { status: 400 })
      }

      const creatorData = creatorDoc.data()!
      const creatorStripeAccountId = creatorData.stripeAccountId

      if (!creatorStripeAccountId) {
        console.error(`❌ [Webhook ${requestId}] No Stripe account for creator: ${creatorId}`)
        return new NextResponse('Creator Stripe account not found', { status: 400 })
      }

      // Verify session through connected account
      let verifiedSession: Stripe.Checkout.Session
      try {
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log(`✅ [Webhook ${requestId}] Session verified through connected account`)
      } catch (error: any) {
        console.error(`❌ [Webhook ${requestId}] Session verification failed:`, error.message)
        return new NextResponse('Session verification failed', { status: 400 })
      }

      // Get bundle data
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (!bundleDoc.exists) {
        console.error(`❌ [Webhook ${requestId}] Bundle not found: ${bundleId}`)
        return new NextResponse('Bundle not found', { status: 400 })
      }

      const bundleData = bundleDoc.data()!
      const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

      if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
        console.error(`❌ [Webhook ${requestId}] No content in bundle: ${bundleId}`)
        return new NextResponse('No bundle content found', { status: 400 })
      }

      // Format content
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
        paymentIntentId: typeof verifiedSession.payment_intent === "string" 
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

      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

      const processingTime = Date.now() - startTime
      console.log(`✅ [Webhook ${requestId}] Purchase created successfully in ${processingTime}ms`)

      return new NextResponse(JSON.stringify({
        received: true,
        purchaseId: session.id,
        contentItems: formattedBundleContent.length,
        processingTime,
        requestId,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Other event types
    console.log(`ℹ️ [Webhook ${requestId}] Unhandled event type: ${event.type}`)
    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`❌ [Webhook ${requestId}] Error after ${processingTime}ms:`, {
      error: error.message,
      stack: error.stack,
    })

    return new NextResponse(JSON.stringify({
      error: 'Webhook processing failed',
      details: error.message,
      requestId,
      processingTime,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
