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

    // STEP 1: Look for existing purchase in bundlePurchases collection FIRST
    console.log(`🔍 [Verify Session] Looking up purchase document: bundlePurchases/${sessionId}`)
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      console.error(`❌ [Verify Session] No purchase found for session: ${sessionId}`)
      console.log(`🔍 [Verify Session] Checking if document exists in collection...`)

      // Debug: Check if any purchases exist with this session ID in a query
      const querySnapshot = await db.collection("bundlePurchases").where("sessionId", "==", sessionId).limit(1).get()
      if (!querySnapshot.empty) {
        console.log(`⚠️ [Verify Session] Found purchase via query but not by document ID`)
        const foundDoc = querySnapshot.docs[0]
        console.log(`🔍 [Verify Session] Found document ID: ${foundDoc.id}`)
      } else {
        console.log(`❌ [Verify Session] No purchase found via query either`)
      }

      return NextResponse.json(
        {
          success: false,
          error: "Purchase not found",
          details: "The webhook may still be processing your purchase. Please wait a moment and try again.",
        },
        { status: 404 },
      )
    }

    const purchaseData = purchaseDoc.data()!
    console.log(`✅ [Verify Session] Found purchase: ${purchaseDoc.id}`)
    console.log(`🔍 [Verify Session] Purchase data:`, {
      creatorId: purchaseData.creatorId,
      creatorStripeAccountId: purchaseData.creatorStripeAccountId,
      itemId: purchaseData.bundleId || purchaseData.productBoxId,
      status: purchaseData.status,
    })

    // STEP 2: Get creator's Stripe account ID
    let creatorStripeAccountId = purchaseData.creatorStripeAccountId // Try from purchase first

    if (!creatorStripeAccountId && purchaseData.creatorId) {
      console.log(`🔍 [Verify Session] No Stripe account in purchase, looking up creator: ${purchaseData.creatorId}`)
      const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()!
        creatorStripeAccountId = creatorData.stripeAccountId
        console.log(`✅ [Verify Session] Found creator Stripe account: ${creatorStripeAccountId}`)
      } else {
        console.error(`❌ [Verify Session] Creator document not found: ${purchaseData.creatorId}`)
      }
    }

    if (!creatorStripeAccountId) {
      console.error(`❌ [Verify Session] No Stripe account found for creator: ${purchaseData.creatorId}`)
      return NextResponse.json(
        {
          success: false,
          error: "Creator account not found",
          details: "Unable to verify payment - creator's Stripe account not configured",
        },
        { status: 400 },
      )
    }

    // STEP 3: Get session from creator's connected Stripe account
    let session: Stripe.Checkout.Session
    try {
      console.log(`🔍 [Verify Session] Retrieving session from connected account: ${creatorStripeAccountId}`)
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
        stripeAccount: creatorStripeAccountId,
      })
      console.log(`✅ [Verify Session] Retrieved Stripe session: ${session.id} from connected account`)
      console.log(`💰 [Verify Session] Session details:`, {
        amount: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
      })
    } catch (error: any) {
      console.error(`❌ [Verify Session] Failed to retrieve Stripe session from connected account:`, error.message)
      console.log(`🔍 [Verify Session] Error details:`, {
        type: error.type,
        code: error.code,
        decline_code: error.decline_code,
        param: error.param,
      })

      // Try platform account as fallback (for older purchases)
      try {
        console.log(`🔄 [Verify Session] Trying platform account as fallback...`)
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "payment_intent"],
        })
        console.log(`✅ [Verify Session] Retrieved session from platform account (fallback)`)
      } catch (fallbackError: any) {
        console.error(
          `❌ [Verify Session] Failed to retrieve from both connected and platform accounts:`,
          fallbackError.message,
        )
        return NextResponse.json(
          {
            success: false,
            error: "Invalid session ID",
            details: `Unable to retrieve session from Stripe. Connected account error: ${error.message}. Platform account error: ${fallbackError.message}`,
          },
          { status: 400 },
        )
      }
    }

    // STEP 4: Verify payment status
    if (session.payment_status !== "paid") {
      console.error(`❌ [Verify Session] Session not paid: ${session.payment_status}`)
      return NextResponse.json(
        {
          success: false,
          error: "Payment not completed",
          details: `Payment status: ${session.payment_status}`,
        },
        { status: 400 },
      )
    }

    console.log(`✅ [Verify Session] Session payment verified: ${session.payment_status}`)

    // STEP 5: Get item details (bundle or product box)
    let itemData = null
    const itemId = purchaseData.bundleId || purchaseData.productBoxId
    const itemType = purchaseData.bundleId ? "bundles" : "productBoxes"

    if (itemId) {
      console.log(`🔍 [Verify Session] Looking up item: ${itemId} in ${itemType}`)
      const itemDoc = await db.collection(itemType).doc(itemId).get()
      if (itemDoc.exists) {
        itemData = itemDoc.data()
        console.log(`✅ [Verify Session] Retrieved item data: ${itemData?.title}`)
      } else {
        console.error(`❌ [Verify Session] Item not found: ${itemId} in ${itemType}`)
      }
    }

    // STEP 6: Get creator details
    let creatorData = null
    if (purchaseData.creatorId) {
      const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
        console.log(`✅ [Verify Session] Retrieved creator data: ${creatorData?.displayName}`)
      }
    }

    // STEP 7: Return verification success with all data
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
    console.log(`📊 [Verify Session] Response summary:`, {
      sessionId: response.session.id,
      amount: response.session.amount,
      itemTitle: response.item?.title,
      creatorName: response.item?.creator?.name,
    })

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
