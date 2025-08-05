import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

/**
 * READ-ONLY: Get session details from Stripe and database
 * This route only reads data - it does NOT handle fulfillment
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("📖 [Get Session Details] READ-ONLY session lookup:", sessionId)

    // First, check if purchase exists in bundlePurchases to get the connected account ID
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    let session: Stripe.Checkout.Session
    let stripeAccountId: string | undefined

    if (purchaseDoc.exists) {
      const purchaseData = purchaseDoc.data()!
      stripeAccountId = purchaseData.stripeAccountId
      console.log("✅ [Get Session Details] Found purchase with connected account:", stripeAccountId)
    }

    // Try to retrieve the session from the correct account
    try {
      if (stripeAccountId) {
        console.log("🔗 [Get Session Details] Retrieving session from connected account:", stripeAccountId)
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          stripeAccount: stripeAccountId,
        })
      } else {
        console.log("🏢 [Get Session Details] Retrieving session from platform account")
        session = await stripe.checkout.sessions.retrieve(sessionId)
      }

      console.log("✅ [Get Session Details] Stripe session retrieved:", {
        id: session.id,
        payment_status: session.payment_status,
        amount: session.amount_total,
        account: stripeAccountId || "platform",
      })
    } catch (stripeError: any) {
      console.error("❌ [Get Session Details] Failed to retrieve session from Stripe:", stripeError)

      // If we have a purchase record but can't get the Stripe session, still return the purchase info
      if (purchaseDoc.exists) {
        const purchaseData = purchaseDoc.data()!
        console.log("⚠️ [Get Session Details] Using purchase data despite Stripe error")

        return NextResponse.json({
          success: true,
          session: {
            id: sessionId,
            amount: purchaseData.amount * 100, // Convert back to cents
            currency: purchaseData.currency || "usd",
            payment_status: "paid", // Assume paid if we have a purchase record
            customerEmail: purchaseData.userEmail,
            created: purchaseData.purchasedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
          warning: "Session retrieved from database due to Stripe API issue",
          note: "READ-ONLY: This route only reads session data",
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "Session not found",
          details: "Could not retrieve session from Stripe and no purchase record found",
        },
        { status: 404 },
      )
    }

    if (!purchaseDoc.exists) {
      console.error("❌ [Get Session Details] Purchase not found in bundlePurchases:", sessionId)
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
    console.log("✅ [Get Session Details] Purchase found:", {
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
      note: "READ-ONLY: This route only reads session data",
    })
  } catch (error: any) {
    console.error("❌ [Get Session Details] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get session details",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
