import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Verify Session] Processing session:", sessionId)

    // Get purchase from bundlePurchases collection (single source of truth)
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      console.log("❌ [Verify Session] Purchase not found in bundlePurchases:", sessionId)
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const purchaseData = purchaseDoc.data()!
    console.log("✅ [Verify Session] Purchase found:", {
      sessionId,
      title: purchaseData.title,
      buyerUid: purchaseData.buyerUid,
      amount: purchaseData.amount,
    })

    // Get Stripe session details for additional info
    let stripeSession = null
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
    } catch (error) {
      console.warn("⚠️ [Verify Session] Could not retrieve Stripe session:", error)
    }

    // Return verification response
    return NextResponse.json({
      success: true,
      session: stripeSession
        ? {
            id: stripeSession.id,
            amount: stripeSession.amount_total || 0,
            currency: stripeSession.currency || "usd",
            payment_status: stripeSession.payment_status || "paid",
            customerEmail: stripeSession.customer_email,
            created: new Date(stripeSession.created * 1000).toISOString(),
          }
        : null,
      purchase: {
        userId: purchaseData.buyerUid,
        userEmail: purchaseData.userEmail,
        userName: purchaseData.userName,
        itemId: purchaseData.itemId,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        type: purchaseData.itemType,
        status: purchaseData.status,
      },
      item: {
        id: purchaseData.itemId,
        title: purchaseData.title,
        description: purchaseData.description,
        thumbnailUrl: purchaseData.thumbnailUrl,
        creator: {
          id: purchaseData.creatorId,
          name: purchaseData.creatorName,
          username: purchaseData.creatorUsername,
        },
      },
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Error:", error)
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
