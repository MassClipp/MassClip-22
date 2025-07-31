import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps } from "firebase-admin/app"
import { cert } from "firebase-admin/app"

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
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // CRITICAL: Validate buyer UID exists in metadata
      const buyerUid = session.metadata?.buyerUid
      if (!buyerUid) {
        console.error("CRITICAL: Anonymous purchase detected - no buyer UID in session metadata", {
          sessionId: session.id,
          metadata: session.metadata,
        })

        // Log this as a critical error but don't fail the webhook
        await db.collection("error_logs").add({
          type: "anonymous_purchase_blocked",
          sessionId: session.id,
          metadata: session.metadata || {},
          timestamp: new Date(),
          severity: "critical",
        })

        return NextResponse.json(
          {
            error: "Purchase blocked: Buyer identification required",
            received: true,
          },
          { status: 400 },
        )
      }

      const creatorId = session.metadata?.creatorId
      const productBoxId = session.metadata?.productBoxId
      const bundleId = session.metadata?.bundleId
      const purchaseType = session.metadata?.purchaseType || "unknown"

      if (!creatorId) {
        console.error("Missing creator ID in session metadata:", session.id)
        return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
      }

      // Verify buyer exists in our database
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (!buyerDoc.exists) {
        console.error("Buyer not found in database:", buyerUid)
        return NextResponse.json({ error: "Buyer not found" }, { status: 404 })
      }

      const buyerData = buyerDoc.data()

      // Create purchase record with full buyer information
      const purchaseData = {
        buyerUid: buyerUid,
        buyerEmail: buyerData?.email || session.customer_details?.email || "",
        buyerName: buyerData?.name || session.customer_details?.name || "",
        creatorId: creatorId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        status: "completed",
        purchaseType: purchaseType,
        createdAt: new Date(),
        metadata: {
          ...session.metadata,
          customerDetails: session.customer_details,
        },
      }

      // Add specific product/bundle information
      if (productBoxId) {
        purchaseData.productBoxId = productBoxId
      }
      if (bundleId) {
        purchaseData.bundleId = bundleId
      }

      // Save to purchases collection
      const purchaseRef = await db.collection("purchases").add(purchaseData)

      // Grant access based on purchase type
      if (productBoxId) {
        // Grant product box access
        await db.collection("product_box_purchases").add({
          buyerUid: buyerUid,
          productBoxId: productBoxId,
          creatorId: creatorId,
          purchaseId: purchaseRef.id,
          sessionId: session.id,
          grantedAt: new Date(),
          status: "active",
        })

        console.log("Product box access granted:", {
          buyerUid,
          productBoxId,
          purchaseId: purchaseRef.id,
        })
      }

      if (bundleId) {
        // Grant bundle access
        await db.collection("bundle_purchases").add({
          buyerUid: buyerUid,
          bundleId: bundleId,
          creatorId: creatorId,
          purchaseId: purchaseRef.id,
          sessionId: session.id,
          grantedAt: new Date(),
          status: "active",
        })

        console.log("Bundle access granted:", {
          buyerUid,
          bundleId,
          purchaseId: purchaseRef.id,
        })
      }

      // Update creator's sales statistics
      const creatorRef = db.collection("users").doc(creatorId)
      await creatorRef.update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(purchaseData.amount),
        lastSaleAt: new Date(),
      })

      console.log("Purchase completed successfully:", {
        purchaseId: purchaseRef.id,
        buyerUid: buyerUid,
        creatorId: creatorId,
        amount: purchaseData.amount,
        type: purchaseType,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
