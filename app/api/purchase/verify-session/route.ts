import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Purchase Verify] Verifying session:", sessionId)

    // Get Stripe session details
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("✅ [Purchase Verify] Stripe session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      amount: session.amount_total,
    })

    // Check if purchase exists in bundlePurchases
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      console.error("❌ [Purchase Verify] Purchase not found in bundlePurchases:", sessionId)
      return NextResponse.json(
        {
          success: false,
          error: "Purchase not found",
          details: "This purchase was not found in our records",
        },
        { status: 404 },
      )
    }

    const purchaseData = purchaseDoc.data()!
    console.log("✅ [Purchase Verify] Purchase found:", {
      itemId: purchaseData.itemId,
      buyerUid: purchaseData.buyerUid,
      title: purchaseData.title,
    })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        payment_status: session.payment_status,
        customerEmail: session.customer_email,
        created: new Date(session.created * 1000).toISOString(),
      },
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
    console.error("❌ [Purchase Verify] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
