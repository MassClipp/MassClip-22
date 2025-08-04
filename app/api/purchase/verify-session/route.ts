import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification")

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] No session ID provided")
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Verify Session] Verifying session: ${sessionId}`)

    // Get session from Stripe
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
      })
      console.log(`✅ [Verify Session] Retrieved Stripe session: ${session.id}`)
    } catch (error: any) {
      console.error(`❌ [Verify Session] Failed to retrieve Stripe session:`, error)
      return NextResponse.json({ success: false, error: "Invalid session ID" }, { status: 400 })
    }

    if (session.payment_status !== "paid") {
      console.error(`❌ [Verify Session] Session not paid: ${session.payment_status}`)
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 })
    }

    // Look for existing purchase in bundlePurchases collection
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      console.error(`❌ [Verify Session] No purchase found for session: ${sessionId}`)
      return NextResponse.json(
        { success: false, error: "Purchase not found. The webhook may still be processing." },
        { status: 404 },
      )
    }

    const purchaseData = purchaseDoc.data()!
    console.log(`✅ [Verify Session] Found purchase: ${purchaseDoc.id}`)

    // Get item details (bundle or product box)
    let itemData = null
    const itemId = purchaseData.bundleId || purchaseData.productBoxId
    const itemType = purchaseData.bundleId ? "bundles" : "productBoxes"

    if (itemId) {
      const itemDoc = await db.collection(itemType).doc(itemId).get()
      if (itemDoc.exists) {
        itemData = itemDoc.data()
        console.log(`✅ [Verify Session] Retrieved item data: ${itemData?.title}`)
      }
    }

    // Get creator details
    let creatorData = null
    if (purchaseData.creatorId) {
      const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
        console.log(`✅ [Verify Session] Retrieved creator data: ${creatorData?.displayName}`)
      }
    }

    // Return verification success with all data
    const response = {
      success: true,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        payment_status: session.payment_status,
        customerEmail: session.customer_details?.email,
        created: new Date(session.created * 1000).toISOString(),
      },
      purchase: {
        userId: purchaseData.buyerUid,
        userEmail: purchaseData.userEmail,
        userName: purchaseData.userName,
        itemId: itemId,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        type: purchaseData.bundleId ? "bundle" : "product_box",
        status: purchaseData.status,
      },
      item: itemData
        ? {
            id: itemId,
            title: itemData.title,
            description: itemData.description,
            thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail,
            creator: creatorData
              ? {
                  id: purchaseData.creatorId,
                  name: creatorData.displayName || creatorData.name,
                  username: creatorData.username,
                }
              : null,
          }
        : null,
    }

    console.log(`✅ [Verify Session] Verification successful for session: ${sessionId}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification error:", error)
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
