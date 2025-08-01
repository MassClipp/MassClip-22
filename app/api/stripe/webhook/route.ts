import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"
import { headers } from "next/headers"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🎣 [Stripe Webhook] Received webhook request")

    const body = await request.text()
    const signature = headers().get("stripe-signature")

    if (!signature) {
      console.error("❌ [Stripe Webhook] No signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      // Use the appropriate webhook secret based on environment
      const webhookSecret =
        process.env.NODE_ENV === "production"
          ? process.env.STRIPE_WEBHOOK_SECRET_LIVE
          : process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET

      if (!webhookSecret) {
        console.error("❌ [Stripe Webhook] No webhook secret configured")
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
      }

      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log("✅ [Stripe Webhook] Event verified:", event.type)
    } catch (err: any) {
      console.error("❌ [Stripe Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("💳 [Stripe Webhook] Processing completed checkout session:", session.id)

      // CRITICAL: Validate buyer UID exists in metadata
      const buyerUid = session.metadata?.buyerUid
      const bundleId = session.metadata?.bundleId
      const creatorId = session.metadata?.creatorId

      console.log("📋 [Stripe Webhook] Session metadata:", {
        buyerUid,
        bundleId,
        creatorId,
        buyerEmail: session.metadata?.buyerEmail,
        buyerName: session.metadata?.buyerName,
        timestamp: session.metadata?.timestamp,
      })

      // CRITICAL: Reject anonymous purchases
      if (!buyerUid) {
        console.error("🚨 [Stripe Webhook] CRITICAL: Anonymous purchase attempt detected!")
        console.error("   Session ID:", session.id)
        console.error("   Customer Email:", session.customer_email)
        console.error("   Amount:", session.amount_total)
        console.error("   Metadata:", session.metadata)

        // Log this as a critical security event
        await db.collection("security_events").add({
          type: "anonymous_purchase_attempt",
          sessionId: session.id,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total,
          metadata: session.metadata,
          timestamp: new Date(),
          severity: "critical",
        })

        return NextResponse.json(
          {
            error: "Anonymous purchases not allowed",
            sessionId: session.id,
          },
          { status: 400 },
        )
      }

      if (!bundleId || !creatorId) {
        console.error("❌ [Stripe Webhook] Missing required metadata:", { buyerUid, bundleId, creatorId })
        return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
      }

      // Verify buyer exists in database
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (!buyerDoc.exists) {
        console.error("❌ [Stripe Webhook] Buyer not found in database:", buyerUid)
        return NextResponse.json({ error: "Buyer not found" }, { status: 404 })
      }

      const buyerData = buyerDoc.data()!
      console.log("✅ [Stripe Webhook] Buyer verified:", {
        uid: buyerUid,
        email: buyerData.email,
        displayName: buyerData.displayName,
      })

      // Get bundle details
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (!bundleDoc.exists) {
        console.error("❌ [Stripe Webhook] Bundle not found:", bundleId)
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const bundleData = bundleDoc.data()!
      console.log("📦 [Stripe Webhook] Bundle details:", {
        id: bundleId,
        title: bundleData.title,
        price: bundleData.price,
        creatorId: bundleData.creatorId,
      })

      // Create purchase record with buyer UID
      const purchaseData = {
        buyerUid, // CRITICAL: Always include buyer UID
        buyerEmail: session.metadata?.buyerEmail || session.customer_email || buyerData.email,
        buyerName: session.metadata?.buyerName || buyerData.displayName || buyerData.name,
        bundleId,
        creatorId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        status: "completed",
        purchaseDate: new Date(),
        stripeAccountId: event.account || null,
        environment: process.env.NODE_ENV || "development",
        metadata: {
          originalDomain: session.metadata?.originalDomain,
          timestamp: session.metadata?.timestamp,
          bundleTitle: bundleData.title,
          bundlePrice: bundleData.price,
        },
      }

      console.log("💾 [Stripe Webhook] Creating purchase record:", {
        buyerUid,
        bundleId,
        sessionId: session.id,
        amountTotal: session.amount_total,
      })

      // Save purchase record
      const purchaseRef = await db.collection("purchases").add(purchaseData)
      console.log("✅ [Stripe Webhook] Purchase record created:", purchaseRef.id)

      // Grant access to bundle content
      const accessData = {
        userId: buyerUid, // CRITICAL: Use verified buyer UID
        bundleId,
        grantedAt: new Date(),
        purchaseId: purchaseRef.id,
        sessionId: session.id,
        status: "active",
      }

      await db.collection("bundle_access").add(accessData)
      console.log("🔓 [Stripe Webhook] Bundle access granted to buyer:", buyerUid)

      // Update creator sales record
      const salesData = {
        creatorId,
        buyerUid, // CRITICAL: Include buyer UID in sales record
        buyerEmail: purchaseData.buyerEmail,
        bundleId,
        bundleTitle: bundleData.title,
        amount: session.amount_total,
        currency: session.currency,
        sessionId: session.id,
        purchaseId: purchaseRef.id,
        saleDate: new Date(),
        stripeAccountId: event.account || null,
        environment: process.env.NODE_ENV || "development",
      }

      await db.collection("sales").add(salesData)
      console.log("📊 [Stripe Webhook] Sales record created for creator:", creatorId)

      // Update bundle statistics
      await db
        .collection("bundles")
        .doc(bundleId)
        .update({
          totalSales: (bundleData.totalSales || 0) + 1,
          totalRevenue: (bundleData.totalRevenue || 0) + (session.amount_total || 0),
          lastSaleDate: new Date(),
        })

      console.log("✅ [Stripe Webhook] Purchase processing completed successfully")
      console.log("   Buyer UID:", buyerUid)
      console.log("   Bundle ID:", bundleId)
      console.log("   Purchase ID:", purchaseRef.id)
      console.log("   Amount:", session.amount_total)

      return NextResponse.json({
        success: true,
        purchaseId: purchaseRef.id,
        buyerUid,
        bundleId,
      })
    }

    // Handle payment_intent.succeeded event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log("💰 [Stripe Webhook] Payment intent succeeded:", paymentIntent.id)

      // CRITICAL: Validate buyer UID in payment intent metadata
      const buyerUid = paymentIntent.metadata?.buyerUid
      if (!buyerUid) {
        console.error("🚨 [Stripe Webhook] CRITICAL: Payment intent without buyer UID!")
        console.error("   Payment Intent ID:", paymentIntent.id)
        console.error("   Amount:", paymentIntent.amount)
        console.error("   Metadata:", paymentIntent.metadata)

        return NextResponse.json(
          {
            error: "Payment intent missing buyer identification",
          },
          { status: 400 },
        )
      }

      // Update purchase record with payment confirmation
      const purchaseQuery = await db
        .collection("purchases")
        .where("paymentIntentId", "==", paymentIntent.id)
        .where("buyerUid", "==", buyerUid) // CRITICAL: Verify buyer UID matches
        .limit(1)
        .get()

      if (!purchaseQuery.empty) {
        const purchaseDoc = purchaseQuery.docs[0]
        await purchaseDoc.ref.update({
          paymentConfirmed: true,
          paymentConfirmedAt: new Date(),
          finalAmount: paymentIntent.amount,
          finalCurrency: paymentIntent.currency,
        })
        console.log("✅ [Stripe Webhook] Purchase payment confirmed for buyer:", buyerUid)
      }

      return NextResponse.json({ success: true })
    }

    console.log("ℹ️ [Stripe Webhook] Unhandled event type:", event.type)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [Stripe Webhook] Error processing webhook:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
