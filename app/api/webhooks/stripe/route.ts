import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { getAdminDb } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const db = getAdminDb() // Declare db variable here

  try {
    console.log("🎣 [Webhook] Received Stripe webhook...")

    const body = await request.text()
    const headersList = headers()
    const sig = headersList.get("stripe-signature")

    if (!sig) {
      console.error("❌ [Webhook] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log("✅ [Webhook] Event verified:", event.type)
    } catch (err: any) {
      console.error("❌ [Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    // Handle checkout.session.completed events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("💳 [Webhook] Processing completed checkout session:", session.id)

      // Extract buyer UID from session
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id
      console.log("👤 [Webhook] Buyer UID from session:", buyerUid)

      if (!buyerUid) {
        console.error("❌ [Webhook] No buyer UID found in session - rejecting anonymous purchase")
        console.log("📋 [Webhook] Session metadata:", session.metadata)
        console.log("📋 [Webhook] Client reference ID:", session.client_reference_id)
        return NextResponse.json({ error: "No buyer UID found - anonymous purchases not allowed" }, { status: 400 })
      }

      // Validate buyer exists in Firebase
      console.log("🔍 [Webhook] Validating buyer exists in Firebase:", buyerUid)
      try {
        const buyerDoc = await db.collection("users").doc(buyerUid).get()
        if (!buyerDoc.exists) {
          console.error("❌ [Webhook] Buyer not found in Firebase:", buyerUid)
          return NextResponse.json({ error: "Buyer not found in database" }, { status: 400 })
        }
        console.log("✅ [Webhook] Buyer validated:", buyerUid)
      } catch (error) {
        console.error("❌ [Webhook] Failed to validate buyer:", error)
        return NextResponse.json({ error: "Failed to validate buyer" }, { status: 500 })
      }

      // Extract bundle information
      const bundleId = session.metadata?.bundleId
      const creatorId = session.metadata?.creatorId
      const itemType = session.metadata?.itemType || "bundle"

      console.log("📦 [Webhook] Purchase details:", {
        bundleId,
        creatorId,
        itemType,
        buyerUid,
        amount: session.amount_total,
        currency: session.currency,
      })

      if (!bundleId) {
        console.error("❌ [Webhook] No bundle ID found in session metadata")
        return NextResponse.json({ error: "No bundle ID found" }, { status: 400 })
      }

      // Check if purchase already exists
      console.log("🔍 [Webhook] Checking for existing purchase...")
      const existingPurchaseQuery = await db
        .collection("purchases")
        .where("sessionId", "==", session.id)
        .where("buyerUid", "==", buyerUid)
        .limit(1)
        .get()

      if (!existingPurchaseQuery.empty) {
        console.log("ℹ️ [Webhook] Purchase already exists, skipping...")
        return NextResponse.json({ received: true, message: "Purchase already processed" })
      }

      // Get connected account ID from event account
      const connectedAccountId = event.account || null
      console.log("🔗 [Webhook] Connected account ID:", connectedAccountId)

      // Create comprehensive purchase record
      console.log("💾 [Webhook] Creating purchase record...")
      const purchaseData = {
        // Core purchase info
        sessionId: session.id,
        bundleId,
        itemId: bundleId,
        itemType,
        buyerUid, // CRITICAL: Always store buyer UID
        creatorId: creatorId || null,
        connectedAccountId,

        // Payment details
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        paymentStatus: session.payment_status,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,

        // Customer details
        customerEmail: session.customer_details?.email || session.metadata?.buyerEmail || null,
        customerName: session.customer_details?.name || session.metadata?.buyerName || null,

        // Buyer metadata from session
        buyerEmail: session.metadata?.buyerEmail || null,
        buyerName: session.metadata?.buyerName || null,
        buyerUsername: session.metadata?.buyerUsername || null,
        buyerProfilePicture: session.metadata?.buyerProfilePicture || null,
        buyerPlan: session.metadata?.buyerPlan || "free",

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        purchasedAt: new Date(session.created * 1000),

        // Metadata
        stripeSessionId: session.id,
        verificationMethod: "webhook",
        webhookProcessedAt: new Date(),
        platform: "massclip",
        version: "2.0",
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      const purchaseId = purchaseRef.id
      console.log("✅ [Webhook] Purchase record created:", purchaseId)

      // Grant user access to the bundle
      console.log("🔓 [Webhook] Granting user access...")
      try {
        // Get bundle data for user access
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        const bundleData = bundleDoc.exists ? bundleDoc.data() : {}

        // Add to user's purchases subcollection
        await db
          .collection("users")
          .doc(buyerUid)
          .collection("purchases")
          .doc(purchaseId)
          .set({
            bundleId,
            itemId: bundleId,
            itemType,
            purchaseId,
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency,
            purchasedAt: new Date(),
            status: "active",
            bundleTitle: bundleData?.title || "Unknown Bundle",
            creatorId,
            creatorName: session.metadata?.creatorName || "Unknown Creator",
            verified: true,
          })

        // Update user's main document with bundle access
        await db
          .collection("users")
          .doc(buyerUid)
          .update({
            [`bundleAccess.${bundleId}`]: {
              purchaseId,
              sessionId: session.id,
              grantedAt: new Date(),
              accessType: "purchased",
              amount: session.amount_total,
              currency: session.currency,
              verified: true,
            },
            updatedAt: new Date(),
          })

        console.log("✅ [Webhook] User access granted successfully")
      } catch (error) {
        console.error("❌ [Webhook] Failed to grant user access:", error)
        // Don't fail the webhook, but log the error
      }

      // Update creator's sales stats (optional)
      if (creatorId) {
        try {
          console.log("📊 [Webhook] Updating creator sales stats...")
          await db
            .collection("users")
            .doc(creatorId)
            .update({
              [`salesStats.totalSales`]: db.FieldValue.increment(1),
              [`salesStats.totalRevenue`]: db.FieldValue.increment(session.amount_total || 0),
              [`salesStats.lastSaleAt`]: new Date(),
              updatedAt: new Date(),
            })
          console.log("✅ [Webhook] Creator stats updated")
        } catch (error) {
          console.error("❌ [Webhook] Failed to update creator stats:", error)
          // Don't fail the webhook
        }
      }

      console.log("✅ [Webhook] Checkout session processed successfully")
      return NextResponse.json({
        received: true,
        purchaseId,
        buyerUid,
        bundleId,
        verified: true,
      })
    }

    // Handle payment intent succeeded (alternative event)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log("💰 [Webhook] Payment intent succeeded:", paymentIntent.id)
      console.log("💰 [Webhook] Connected account:", event.account)
      console.log("💰 [Webhook] Payment intent metadata:", paymentIntent.metadata)

      // Extract details from payment intent metadata
      const bundleId = paymentIntent.metadata?.bundleId
      const buyerUid = paymentIntent.metadata?.buyerUid
      const buyerEmail = paymentIntent.metadata?.buyerEmail
      const buyerName = paymentIntent.metadata?.buyerName
      const creatorId = paymentIntent.metadata?.creatorId
      const connectedAccountId = event.account

      if (bundleId && buyerUid && connectedAccountId) {
        console.log("📊 [Webhook] Processing payment intent completion with valid buyer ID")

        // Verify buyer exists
        try {
          const buyerDoc = await db.collection("users").doc(buyerUid).get()
          if (!buyerDoc.exists) {
            console.error("❌ [Webhook] Buyer not found for payment intent:", buyerUid)
            return NextResponse.json({ received: true }) // Still acknowledge webhook
          }

          // Create purchase record if not already exists
          const existingPurchaseQuery = await db
            .collection("purchases")
            .where("buyerUid", "==", buyerUid)
            .where("bundleId", "==", bundleId)
            .where("paymentIntentId", "==", paymentIntent.id)
            .limit(1)
            .get()

          if (existingPurchaseQuery.empty) {
            const purchaseData = {
              buyerUid,
              bundleId,
              creatorId,
              paymentIntentId: paymentIntent.id,
              connectedAccountId,
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              currency: paymentIntent.currency || "usd",
              status: "completed",
              purchasedAt: new Date(),
              buyerEmail,
              buyerName,
              metadata: {
                ...paymentIntent.metadata,
                source: "payment_intent_webhook",
                webhookProcessedAt: new Date().toISOString(),
              },
            }

            const purchaseRef = db.collection("purchases").doc()
            await purchaseRef.set(purchaseData)

            console.log("✅ [Webhook] Payment intent purchase record created:", purchaseRef.id)
          } else {
            console.log("ℹ️ [Webhook] Payment intent purchase already exists")
          }
        } catch (error) {
          console.error("❌ [Webhook] Error processing payment intent:", error)
        }
      } else {
        console.warn("⚠️ [Webhook] Payment intent missing required metadata:", {
          bundleId: !!bundleId,
          buyerUid: !!buyerUid,
          connectedAccountId: !!connectedAccountId,
        })
      }
    }

    // Handle other event types
    console.log("ℹ️ [Webhook] Unhandled event type:", event.type)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("❌ [Webhook] Processing failed:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
