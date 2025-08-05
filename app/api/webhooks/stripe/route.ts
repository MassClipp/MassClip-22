import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  let event: Stripe.Event

  try {
    // Get the raw body as a buffer - this is crucial for signature verification
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      console.error("❌ Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    console.log("🔍 Webhook received:")
    console.log("- Body length:", body.length)
    console.log("- Signature present:", !!signature)
    console.log("- Endpoint secret present:", !!endpointSecret)

    try {
      // Construct the event using the raw body string and signature
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
      console.log("✅ Webhook signature verified successfully")
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message)
      console.error("- Error type:", err.type)
      console.error("- Error code:", err.code)

      // Log additional debugging info
      console.error("Debug info:")
      console.error("- Webhook secret length:", endpointSecret?.length || 0)
      console.error("- Signature header:", signature?.substring(0, 50) + "...")
      console.error("- Body preview:", body.substring(0, 100) + "...")

      return NextResponse.json(
        {
          error: `Webhook Error: ${err.message}`,
          debug: {
            hasSecret: !!endpointSecret,
            hasSignature: !!signature,
            bodyLength: body.length,
          },
        },
        { status: 400 },
      )
    }

    console.log("🎯 Processing event:", event.type, "ID:", event.id)

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log("💳 Processing checkout session:", session.id)
      console.log("📋 Session metadata:", session.metadata)

      // Extract metadata
      const creatorId = session.metadata?.creatorId
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

      if (!creatorId || !bundleId) {
        console.error("❌ Missing required metadata:", { creatorId, bundleId, buyerUid })
        return NextResponse.json({ error: "Missing required metadata" }, { status: 400 })
      }

      // Check for duplicate processing
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log("⚠️ Purchase already processed for session:", session.id)
        return NextResponse.json({ received: true, message: "Already processed" })
      }

      // Get creator info
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (!creatorDoc.exists) {
        console.error("❌ Creator not found:", creatorId)
        return NextResponse.json({ error: "Creator not found" }, { status: 400 })
      }

      const creatorData = creatorDoc.data()!
      const creatorStripeAccountId = creatorData.stripeAccountId

      if (!creatorStripeAccountId) {
        console.error("❌ Creator missing Stripe account:", creatorId)
        return NextResponse.json({ error: "Creator Stripe account not found" }, { status: 400 })
      }

      // Verify session through connected account
      let verifiedSession: Stripe.Checkout.Session
      try {
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log("✅ Session verified through connected account")
      } catch (error: any) {
        console.error("❌ Session verification failed:", error.message)
        return NextResponse.json({ error: "Session verification failed" }, { status: 400 })
      }

      // Get bundle data
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (!bundleDoc.exists) {
        console.error("❌ Bundle not found:", bundleId)
        return NextResponse.json({ error: "Bundle not found" }, { status: 400 })
      }

      const bundleData = bundleDoc.data()!
      const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

      if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
        console.error("❌ No content in bundle:", bundleId)
        return NextResponse.json({ error: "No bundle content found" }, { status: 400 })
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

      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

      console.log("✅ Purchase processed successfully:", {
        sessionId: session.id,
        bundleId: bundleId,
        creatorId: creatorId,
        contentItems: formattedBundleContent.length,
      })

      return NextResponse.json({
        received: true,
        message: "Purchase processed successfully",
        purchaseId: session.id,
        contentItems: formattedBundleContent.length,
      })
    }

    // Handle other event types
    console.log("ℹ️ Unhandled event type:", event.type)
    return NextResponse.json({ received: true, message: `Event ${event.type} received` })
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Disable body parsing for this route
export const runtime = "nodejs"
