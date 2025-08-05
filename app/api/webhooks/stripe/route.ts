import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper function to convert ReadableStream to Buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  // Combine all chunks into a single buffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const buffer = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  return Buffer.from(buffer)
}

export async function POST(req: NextRequest) {
  console.log("🚀 Webhook received")

  try {
    // Get the raw body using the most reliable method for Next.js App Router
    let rawBody: Buffer

    if (req.body) {
      // If body is available as a ReadableStream, convert it to Buffer
      rawBody = await streamToBuffer(req.body)
    } else {
      // Fallback to arrayBuffer method
      const arrayBuffer = await req.arrayBuffer()
      rawBody = Buffer.from(arrayBuffer)
    }

    // Get signature from headers
    const sig = req.headers.get("stripe-signature")

    if (!sig) {
      console.error("❌ No stripe-signature header")
      return NextResponse.json({ error: "No stripe-signature header" }, { status: 400 })
    }

    console.log("🔍 Debug info:")
    console.log("- Raw body length:", rawBody.length)
    console.log("- Raw body type:", typeof rawBody)
    console.log("- Signature present:", !!sig)
    console.log("- Webhook secret present:", !!endpointSecret)
    console.log("- Webhook secret starts with whsec_:", endpointSecret.startsWith("whsec_"))

    let event: Stripe.Event

    try {
      // Use the raw Buffer directly for signature verification
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
      console.log("✅ Webhook signature verified successfully")
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:")
      console.error("- Error message:", err.message)
      console.error("- Error type:", err.type)

      // Additional debugging
      console.error("Debug details:")
      console.error("- Signature header length:", sig.length)
      console.error("- Signature preview:", sig.substring(0, 50))
      console.error("- Raw body first 100 chars:", rawBody.toString("utf8", 0, 100))
      console.error("- Raw body as hex (first 50 bytes):", rawBody.subarray(0, 50).toString("hex"))

      return NextResponse.json(
        {
          error: `Webhook Error: ${err.message}`,
          debug: {
            hasSecret: !!endpointSecret,
            hasSignature: !!sig,
            bodyLength: rawBody.length,
            secretFormat: endpointSecret.startsWith("whsec_") ? "correct" : "incorrect",
            bodyType: typeof rawBody,
            isBuffer: Buffer.isBuffer(rawBody),
          },
        },
        { status: 400 },
      )
    }

    console.log(`🎯 Processing event: ${event.type} (ID: ${event.id})`)

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 Processing checkout session: ${session.id}`)
      console.log(`📋 Session metadata:`, session.metadata)

      // Extract metadata
      const creatorId = session.metadata?.creatorId
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

      if (!creatorId || !bundleId) {
        console.error("❌ Missing required metadata:", { creatorId, bundleId, buyerUid })
        return NextResponse.json({ error: "Missing required metadata" }, { status: 400 })
      }

      console.log(`✅ Required metadata found - Creator: ${creatorId}, Bundle: ${bundleId}, Buyer: ${buyerUid}`)

      // Check for duplicate processing
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ Purchase already processed for session: ${session.id}`)
        return NextResponse.json({ received: true, message: "Purchase already processed" })
      }

      // Get creator info
      console.log(`🔍 Looking up creator: ${creatorId}`)
      const creatorDoc = await db.collection("users").doc(creatorId).get()

      if (!creatorDoc.exists) {
        console.error(`❌ Creator not found: ${creatorId}`)
        return NextResponse.json({ error: "Creator not found" }, { status: 400 })
      }

      const creatorData = creatorDoc.data()!
      const creatorStripeAccountId = creatorData.stripeAccountId

      if (!creatorStripeAccountId) {
        console.error(`❌ Creator has no Stripe account: ${creatorId}`)
        return NextResponse.json({ error: "Creator Stripe account not found" }, { status: 400 })
      }

      console.log(`✅ Creator Stripe account found: ${creatorStripeAccountId}`)

      // Verify session through seller's connected Stripe account
      let verifiedSession: Stripe.Checkout.Session
      try {
        console.log(`🔍 Verifying session through connected account: ${creatorStripeAccountId}`)
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "payment_intent"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log(`✅ Session verified through connected account`)
        console.log(`💰 Verified amount: ${verifiedSession.amount_total} ${verifiedSession.currency}`)
      } catch (error: any) {
        console.error(`❌ Failed to verify session through connected account:`, error.message)
        return NextResponse.json({ error: "Session verification failed" }, { status: 400 })
      }

      // Get bundle with all content information
      console.log(`🔍 Fetching bundle: ${bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error(`❌ Bundle not found: ${bundleId}`)
        return NextResponse.json({ error: "Bundle not found" }, { status: 400 })
      }

      const bundleData = bundleDoc.data()!
      console.log(`✅ Bundle found: ${bundleData.title}`)

      // Extract bundle content directly from bundle document
      const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

      if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
        console.error(`❌ No content found in bundle: ${bundleId}`)
        console.log(`🔍 Bundle data keys:`, Object.keys(bundleData))
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

      console.log(`📦 Processed ${formattedBundleContent.length} content items`)

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

      console.log(`💾 Creating purchase document: bundlePurchases/${session.id}`)
      await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

      console.log(`✅ Purchase document created successfully`)
      console.log(`📊 Purchase summary:`, {
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
    console.log(`ℹ️ Unhandled event type: ${event.type}`)
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
