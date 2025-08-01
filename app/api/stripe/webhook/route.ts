import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("🔔 Webhook received:", event.type)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log("💳 Processing completed checkout session:", session.id)
      console.log("📋 Session metadata:", session.metadata)

      // CRITICAL: Validate buyer UID exists
      const buyerUid = session.metadata?.buyerUid
      if (!buyerUid) {
        console.error("🚨 CRITICAL: Anonymous purchase attempt detected!", {
          sessionId: session.id,
          metadata: session.metadata,
          customerEmail: session.customer_email,
        })

        // Log this as a security event
        await db.collection("securityEvents").add({
          type: "anonymous_purchase_attempt",
          sessionId: session.id,
          metadata: session.metadata,
          customerEmail: session.customer_email,
          timestamp: FieldValue.serverTimestamp(),
          severity: "critical",
        })

        return NextResponse.json({ error: "Anonymous purchases not allowed" }, { status: 400 })
      }

      // Validate buyer exists in database
      try {
        const buyerDoc = await db.collection("users").doc(buyerUid).get()
        if (!buyerDoc.exists) {
          console.error("❌ Buyer not found in database:", buyerUid)
          return NextResponse.json({ error: "Invalid buyer" }, { status: 400 })
        }
        console.log("✅ Buyer verified:", buyerUid)
      } catch (error: any) {
        console.error("❌ Error verifying buyer:", error.message)
        return NextResponse.json({ error: "Buyer verification failed" }, { status: 500 })
      }

      const bundleId = session.metadata?.bundleId
      const sellerId = session.metadata?.sellerId
      const buyerEmail = session.metadata?.buyerEmail || session.customer_email
      const buyerName = session.metadata?.buyerName

      if (!bundleId || !sellerId) {
        console.error("❌ Missing required metadata:", { bundleId, sellerId })
        return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
      }

      // Get payment intent for amount details
      let paymentIntent
      try {
        if (session.payment_intent) {
          paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
        }
      } catch (error: any) {
        console.warn("⚠️ Could not retrieve payment intent:", error.message)
      }

      const amount = paymentIntent?.amount || session.amount_total || 0
      const currency = paymentIntent?.currency || "usd"

      // Create purchase record with buyer UID
      const purchaseData = {
        buyerUid,
        buyerEmail,
        buyerName,
        bundleId,
        sellerId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amount,
        currency,
        status: "completed",
        purchaseDate: FieldValue.serverTimestamp(),
        metadata: session.metadata,
        environment: session.metadata?.environment || "unknown",
      }

      try {
        console.log("💾 Creating purchase record...")
        const purchaseRef = await db.collection("purchases").add(purchaseData)
        console.log("✅ Purchase record created:", purchaseRef.id)

        // Grant access to buyer
        await db.collection("userAccess").doc(`${buyerUid}_${bundleId}`).set({
          userId: buyerUid,
          bundleId,
          purchaseId: purchaseRef.id,
          grantedAt: FieldValue.serverTimestamp(),
          accessType: "purchased",
        })

        console.log("✅ Access granted to buyer:", buyerUid)

        // Update seller's sales record
        await db.collection("sales").add({
          sellerId,
          buyerUid,
          buyerEmail,
          bundleId,
          purchaseId: purchaseRef.id,
          sessionId: session.id,
          amount,
          currency,
          saleDate: FieldValue.serverTimestamp(),
          status: "completed",
        })

        console.log("✅ Sales record created for seller:", sellerId)

        // Update bundle statistics
        await db
          .collection("productBoxes")
          .doc(bundleId)
          .update({
            totalSales: FieldValue.increment(1),
            totalRevenue: FieldValue.increment(amount),
            lastSaleDate: FieldValue.serverTimestamp(),
          })

        console.log("✅ Bundle statistics updated")
      } catch (error: any) {
        console.error("❌ Error processing purchase:", error.message)
        return NextResponse.json({ error: "Purchase processing failed" }, { status: 500 })
      }

      console.log("🎉 Purchase processed successfully:", {
        buyerUid,
        bundleId,
        sellerId,
        amount,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error.message)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
