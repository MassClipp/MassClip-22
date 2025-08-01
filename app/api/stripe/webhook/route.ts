import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

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

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    console.error("❌ [Webhook] No Stripe signature found")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    console.log("✅ [Webhook] Event verified:", event.type)
  } catch (error: any) {
    console.error("❌ [Webhook] Signature verification failed:", error.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    console.log("💳 [Webhook] Processing completed checkout session:", session.id)

    // CRITICAL: Validate buyer UID exists in metadata
    const buyerUid = session.metadata?.buyerUid
    if (!buyerUid) {
      console.error("❌ [Webhook] CRITICAL: No buyer UID in session metadata - ANONYMOUS PURCHASE BLOCKED")
      console.error("   Session ID:", session.id)
      console.error("   Metadata:", session.metadata)
      return NextResponse.json({ error: "Anonymous purchase blocked" }, { status: 400 })
    }

    const bundleId = session.metadata?.bundleId
    const sellerId = session.metadata?.sellerId
    const buyerEmail = session.metadata?.buyerEmail || session.customer_email

    console.log("📋 [Webhook] Purchase details:", {
      sessionId: session.id,
      buyerUid,
      buyerEmail,
      bundleId,
      sellerId,
      amount: session.amount_total,
    })

    try {
      // Verify buyer exists in database
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (!buyerDoc.exists) {
        console.error("❌ [Webhook] Buyer not found in database:", buyerUid)
        return NextResponse.json({ error: "Buyer not found" }, { status: 404 })
      }

      // Create purchase record with buyer UID
      const purchaseData = {
        buyerUid, // CRITICAL: Always include buyer UID
        buyerEmail,
        bundleId,
        sellerId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total,
        currency: session.currency,
        status: "completed",
        createdAt: new Date(),
        metadata: session.metadata,
      }

      await db.collection("purchases").add(purchaseData)
      console.log("✅ [Webhook] Purchase record created with buyer UID:", buyerUid)

      // Grant access to buyer
      if (bundleId) {
        await db.collection("users").doc(buyerUid).collection("purchases").doc(bundleId).set({
          bundleId,
          purchaseDate: new Date(),
          sessionId: session.id,
          amount: session.amount_total,
          status: "active",
        })

        console.log("✅ [Webhook] Access granted to buyer:", buyerUid)
      }

      // Record sale for seller
      if (sellerId) {
        await db.collection("users").doc(sellerId).collection("sales").add({
          buyerUid, // CRITICAL: Include buyer UID in sales record
          buyerEmail,
          bundleId,
          sessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          saleDate: new Date(),
          status: "completed",
        })

        console.log("✅ [Webhook] Sale recorded for seller:", sellerId)
      }

      return NextResponse.json({ received: true })
    } catch (error: any) {
      console.error("❌ [Webhook] Error processing purchase:", error.message)
      return NextResponse.json({ error: "Processing failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
