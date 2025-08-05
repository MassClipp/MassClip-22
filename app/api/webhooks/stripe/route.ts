import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body as an ArrayBuffer first, then convert to Buffer
    const arrayBuffer = await request.arrayBuffer()
    const rawBody = Buffer.from(arrayBuffer)

    // Get the Stripe signature from headers
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verify the webhook signature using the raw Buffer
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      console.log(`✅ [Webhook] Signature verified successfully for event: ${event.type}`)
    } catch (err: any) {
      console.error(`❌ [Webhook] Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 [Webhook] Processing checkout session: ${session.id}`)
      console.log(`🔍 [Webhook] Session metadata:`, session.metadata)

      // Extract required metadata
      const creatorId = session.metadata?.creatorId
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

      if (!creatorId || !bundleId) {
        console.error(`❌ [Webhook] Missing required metadata:`, {
          creatorId,
          bundleId,
          buyerUid,
          metadata: session.metadata,
        })
        return NextResponse.json({ error: "Missing required metadata" }, { status: 400 })
      }

      console.log(
        `✅ [Webhook] Required metadata found - Creator: ${creatorId}, Bundle: ${bundleId}, Buyer: ${buyerUid}`,
      )

      // Check if purchase already exists (prevent duplicates)
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ [Webhook] Purchase already exists for session: ${session.id}`)
        return NextResponse.json({ received: true, message: "Purchase already processed" })
      }

      // Get creator's Stripe account ID
      console.log(`🔍 [Webhook] Looking up creator: ${creatorId}`)
      const creatorDoc = await db.collection("users").doc(creatorId).get()

      if (!creatorDoc.exists) {
        console.error(`❌ [Webhook] Creator not found: ${creatorId}`)
        return NextResponse.json({ error: "Creator not found" }, { status: 400 })
      }

      const creatorData = creatorDoc.data()!
      const creatorStripeAccountId = creatorData.stripeAccountId

      if (!creatorStripeAccountId) {
        console.error(`❌ [Webhook] Creator has no Stripe account: ${creatorId}`)
        return NextResponse.json({ error: "Creator Stripe account not found" }, { status: 400 })
      }

      console.log(`✅ [Webhook] Creator Stripe account found: ${creatorStripeAccountId}`)

      // Verify session through seller's connected Stripe account
      let verifiedSession: Stripe.Checkout.Session
      try {
        console.log(`🔍 [Webhook] Verifying session through connected account: ${creatorStripeAccountId}`)
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log(`✅ [Webhook] Session verified through connected account`)
        console.log(`💰 [Webhook] Verified amount: ${verifiedSession.amount_total} ${verifiedSession.currency}`)
      } catch (error: any) {
        console.error(`❌ [Webhook] Failed to verify session through connected account:`, error.message)
        return NextResponse.json({ error: "Session verification failed" }, { status: 400 })
      }

      // Get bundle with all content information
      console.log(`🔍 [Webhook] Fetching bundle: ${bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error(`❌ [Webhook] Bundle not found: ${bundleId}`)
        return NextResponse.json({ error: "Bundle not found" }, { status: 400 })
      }

      const bundleData = bundleDoc.data()!
      console.log(`✅ [Webhook] Bundle found: ${bundleData.title}`)

      // Extract bundle content directly from bundle document
      const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

      if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
        console.error(`❌ [Webhook] No content found in bundle: ${bundleId}`)
        console.log(`🔍 [Webhook] Bundle data keys:`, Object.keys(bundleData))
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

      console.log(`📦 [Webhook] Processed ${formattedBundleContent.length} content items`)

      // Create purchase document with new structure
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
      }

      console.log(`💾 [Webhook] Creating purchase document: bundlePurchases/${session.id}`)
      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

      console.log(`✅ [Webhook] Purchase document created successfully`)
      console.log(`📊 [Webhook] Purchase summary:`, {
        sessionId: session.id,
        bundleId: bundleId,
        bundleTitle: bundleData.title,
        creatorId: creatorId,
        buyerUid: buyerUid,
        contentItems: formattedBundleContent.length,
        amount: verifiedSession.amount_total,
        currency: verifiedSession.currency,
      })

      return NextResponse.json({
        received: true,
        message: "Purchase processed successfully",
        purchaseId: session.id,
        contentItems: formattedBundleContent.length,
      })
    }

    // Handle other event types
    console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true, message: `Unhandled event type: ${event.type}` })
  } catch (error: any) {
    console.error("❌ [Webhook] Processing error:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
