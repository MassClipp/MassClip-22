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
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`❌ [Webhook] Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    console.log(`🎯 [Webhook] Processing event: ${event.type} (${event.id})`)

    // Handle checkout.session.completed events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 [Webhook] Processing checkout session: ${session.id}`)
      console.log(`💰 [Webhook] Amount: ${session.amount_total} ${session.currency}`)
      console.log(`👤 [Webhook] Customer: ${session.customer_details?.email}`)

      // Check if purchase already exists (prevent duplicates)
      const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
      if (existingPurchase.exists) {
        console.log(`⚠️ [Webhook] Purchase already exists for session: ${session.id}`)
        return NextResponse.json({ received: true, message: "Purchase already processed" })
      }

      // Extract metadata from session
      const metadata = session.metadata || {}
      const bundleId = metadata.bundleId
      const creatorId = metadata.creatorId
      const buyerUid = metadata.buyerUid || "anonymous"

      console.log(`📦 [Webhook] Metadata:`, {
        bundleId,
        creatorId,
        buyerUid,
      })

      // Validate required fields
      if (!creatorId) {
        console.error(`❌ [Webhook] Missing creator ID in metadata for session: ${session.id}`)
        return NextResponse.json({ error: "Missing creator ID" }, { status: 400 })
      }

      if (!bundleId) {
        console.error(`❌ [Webhook] Missing bundle ID in metadata for session: ${session.id}`)
        return NextResponse.json({ error: "Missing bundle ID" }, { status: 400 })
      }

      // Get creator's Stripe account ID
      let creatorStripeAccountId: string | null = null
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()!
          creatorStripeAccountId = creatorData.stripeAccountId
          console.log(`✅ [Webhook] Creator found: ${creatorData.displayName} (Stripe: ${creatorStripeAccountId})`)
        } else {
          console.error(`❌ [Webhook] Creator not found: ${creatorId}`)
          return NextResponse.json({ error: "Creator not found" }, { status: 400 })
        }
      } catch (error) {
        console.error(`❌ [Webhook] Error fetching creator:`, error)
        return NextResponse.json({ error: "Failed to fetch creator" }, { status: 500 })
      }

      if (!creatorStripeAccountId) {
        console.error(`❌ [Webhook] Creator has no Stripe account ID: ${creatorId}`)
        return NextResponse.json({ error: "Creator has no Stripe account" }, { status: 400 })
      }

      // Verify session through seller's connected Stripe account
      let verifiedSession: Stripe.Checkout.Session
      try {
        console.log(`🔗 [Webhook] Verifying session ${session.id} through connected account ${creatorStripeAccountId}`)
        verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["payment_intent", "line_items"],
          stripeAccount: creatorStripeAccountId,
        })
        console.log(`✅ [Webhook] Session verified through connected account`)
      } catch (error: any) {
        console.error(`❌ [Webhook] Failed to verify session through connected account:`, error)
        return NextResponse.json({ error: "Failed to verify session through connected account" }, { status: 400 })
      }

      // Get bundle content from Firestore
      const bundleContent: any[] = []
      try {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          const bundleData = bundleDoc.data()!
          console.log(`✅ [Webhook] Bundle found: ${bundleData.title}`)

          // Get content items from the bundle's contentItems array
          if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
            console.log(`📋 [Webhook] Processing ${bundleData.contentItems.length} content items`)

            for (const contentId of bundleData.contentItems) {
              try {
                const contentDoc = await db.collection("creatorUploads").doc(contentId).get()
                if (contentDoc.exists) {
                  const contentData = contentDoc.data()!
                  bundleContent.push({
                    id: contentId,
                    fileUrl: contentData.fileUrl || contentData.videoUrl || "",
                    fileSize: contentData.fileSize || 0,
                    displayTitle: contentData.title || contentData.displayTitle || "Untitled",
                    displaySize: contentData.displaySize || "0 MB",
                    duration: contentData.duration || 0,
                    filename: contentData.filename || contentData.title || "unknown",
                    mimeType: contentData.mimeType || "video/mp4",
                  })
                } else {
                  console.warn(`⚠️ [Webhook] Content item not found: ${contentId}`)
                }
              } catch (error) {
                console.error(`❌ [Webhook] Error fetching content item ${contentId}:`, error)
              }
            }
          }

          console.log(`✅ [Webhook] Processed ${bundleContent.length} content items`)
        } else {
          console.error(`❌ [Webhook] Bundle not found: ${bundleId}`)
          return NextResponse.json({ error: "Bundle not found" }, { status: 400 })
        }
      } catch (error) {
        console.error(`❌ [Webhook] Error fetching bundle content:`, error)
        return NextResponse.json({ error: "Failed to fetch bundle content" }, { status: 500 })
      }

      if (bundleContent.length === 0) {
        console.error(`❌ [Webhook] No bundle content found for bundle: ${bundleId}`)
        return NextResponse.json({ error: "No bundle content found" }, { status: 400 })
      }

      // Create purchase document
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
        bundleContent: bundleContent,
      }

      // Save purchase to bundlePurchases collection
      try {
        await db.collection("bundlePurchases").doc(session.id).set(purchaseData)
        console.log(`✅ [Webhook] Purchase document created: ${session.id}`)
      } catch (error) {
        console.error(`❌ [Webhook] Failed to create purchase document:`, error)
        return NextResponse.json({ error: "Failed to create purchase document" }, { status: 500 })
      }

      console.log(`🎉 [Webhook] Purchase fulfillment completed for session: ${session.id}`)
      console.log(`📊 [Webhook] Purchase summary:`, {
        sessionId: session.id,
        bundleId: bundleId,
        creatorId: creatorId,
        buyerUid: buyerUid,
        contentItems: bundleContent.length,
        amount: verifiedSession.amount_total,
        currency: verifiedSession.currency,
      })

      return NextResponse.json({
        received: true,
        message: "Purchase processed successfully",
        purchaseId: session.id,
        contentItems: bundleContent.length,
      })
    }

    // Handle other event types
    console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true, message: `Unhandled event type: ${event.type}` })
  } catch (error: any) {
    console.error("❌ [Webhook] Error processing webhook:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
