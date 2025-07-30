import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const sig = headersList.get("stripe-signature")!

    console.log("🔔 [Stripe Webhook] Received webhook")

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log("✅ [Stripe Webhook] Event verified:", event.type)
    } catch (err: any) {
      console.error("❌ [Stripe Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Handle successful payment from connected account
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("💳 [Stripe Webhook] Processing completed checkout session:", session.id)
      console.log("💳 [Stripe Webhook] Session metadata:", session.metadata)
      console.log("💳 [Stripe Webhook] Connected account:", event.account)

      // Extract purchase details from session metadata stored on connected account
      const productBoxId = session.metadata?.productBoxId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id
      const buyerEmail = session.metadata?.buyerEmail || session.customer_details?.email
      const buyerName = session.metadata?.buyerName || session.customer_details?.name
      const creatorId = session.metadata?.creatorId
      const connectedAccountId = event.account // This is the creator's Stripe account

      console.log("📊 [Stripe Webhook] Extracted purchase details:", {
        productBoxId,
        buyerUid,
        buyerEmail,
        buyerName,
        creatorId,
        connectedAccountId,
        amount: session.amount_total,
        currency: session.currency,
      })

      if (!productBoxId) {
        console.error("❌ [Stripe Webhook] No productBoxId found in session metadata")
        return NextResponse.json({ error: "Missing product information" }, { status: 400 })
      }

      if (!buyerUid || buyerUid === "anonymous") {
        console.error("❌ [Stripe Webhook] No valid buyerUid found in connected account metadata")
        console.error("❌ [Stripe Webhook] Session metadata:", session.metadata)
        console.error("❌ [Stripe Webhook] Client reference ID:", session.client_reference_id)
        return NextResponse.json({ error: "Missing buyer identification" }, { status: 400 })
      }

      // Verify the buyer exists in Firebase
      let buyerExists = false
      try {
        const buyerDoc = await adminDb.collection("users").doc(buyerUid).get()
        buyerExists = buyerDoc.exists
        console.log("👤 [Stripe Webhook] Buyer verification:", { buyerUid, exists: buyerExists })
      } catch (error) {
        console.error("❌ [Stripe Webhook] Error verifying buyer:", error)
      }

      if (!buyerExists) {
        console.error("❌ [Stripe Webhook] Buyer UID not found in Firebase:", buyerUid)
        return NextResponse.json({ error: "Invalid buyer identification" }, { status: 400 })
      }

      // Create purchase record with all the metadata from connected account
      const purchaseData = {
        buyerUid,
        productBoxId,
        creatorId,
        sessionId: session.id,
        connectedAccountId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        status: "completed",
        purchasedAt: new Date(),
        buyerEmail,
        buyerName,
        customerDetails: session.customer_details,
        paymentIntentId: session.payment_intent,
        metadata: {
          ...session.metadata,
          source: "connected_account_webhook",
          webhookProcessedAt: new Date().toISOString(),
        },
      }

      console.log("💾 [Stripe Webhook] Creating purchase record:", {
        buyerUid,
        productBoxId,
        amount: purchaseData.amount,
      })

      // Store the purchase
      const purchaseRef = adminDb.collection("purchases").doc()
      await purchaseRef.set(purchaseData)

      console.log("✅ [Stripe Webhook] Purchase record created:", purchaseRef.id)

      // Also update user's purchase list for quick access
      try {
        const userPurchasesRef = adminDb.collection("users").doc(buyerUid).collection("purchases").doc(productBoxId)
        await userPurchasesRef.set({
          productBoxId,
          purchaseId: purchaseRef.id,
          purchasedAt: new Date(),
          amount: purchaseData.amount,
          currency: purchaseData.currency,
          sessionId: session.id,
          status: "completed",
        })
        console.log("✅ [Stripe Webhook] User purchase record updated")
      } catch (error) {
        console.error("❌ [Stripe Webhook] Error updating user purchases:", error)
      }

      // Log successful processing
      console.log("🎉 [Stripe Webhook] Purchase completed successfully:", {
        buyerUid,
        productBoxId,
        purchaseId: purchaseRef.id,
        connectedAccount: connectedAccountId,
      })
    }

    console.log("✅ [Stripe Webhook] Webhook processed successfully")
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
