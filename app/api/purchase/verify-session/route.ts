import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification with NEW logic")

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] No session ID provided")
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Verify Session] Verifying session: ${sessionId}`)

    // STEP 1: Look for purchase document using sessionId as document ID
    console.log(`🔍 [Verify Session] Looking up purchase: bundlePurchases/${sessionId}`)
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      console.error(`❌ [Verify Session] No purchase found for session: ${sessionId}`)
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
    console.log(`✅ [Verify Session] Found purchase document`)
    console.log(`🔍 [Verify Session] Purchase data:`, {
      sessionId: purchaseData.sessionId,
      creatorId: purchaseData.creatorId,
      creatorStripeAccountId: purchaseData.creatorStripeAccountId,
      bundleId: purchaseData.bundleId,
      buyerUid: purchaseData.buyerUid,
      status: purchaseData.status,
      webhookProcessed: purchaseData.webhookProcessed,
    })

    // STEP 2: Validate required fields from new data structure
    if (!purchaseData.creatorStripeAccountId) {
      console.error(`❌ [Verify Session] No creatorStripeAccountId in purchase data`)
      return NextResponse.json(
        {
          success: false,
          error: "Creator account not found",
          details: "Unable to verify payment - creator's Stripe account not configured",
        },
        { status: 400 },
      )
    }

    if (!purchaseData.bundleId) {
      console.error(`❌ [Verify Session] No bundleId in purchase data`)
      return NextResponse.json(
        {
          success: false,
          error: "Bundle not found",
          details: "Purchase data is missing bundle information",
        },
        { status: 400 },
      )
    }

    // STEP 3: Verify session through creator's connected Stripe account
    let session: Stripe.Checkout.Session
    try {
      console.log(
        `🔍 [Verify Session] Retrieving session from connected account: ${purchaseData.creatorStripeAccountId}`,
      )
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
        stripeAccount: purchaseData.creatorStripeAccountId,
      })
      console.log(`✅ [Verify Session] Retrieved Stripe session from connected account`)
      console.log(`💰 [Verify Session] Session details:`, {
        id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
      })
    } catch (error: any) {
      console.error(`❌ [Verify Session] Failed to retrieve session from connected account:`, error.message)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session ID",
          details: `Unable to retrieve session from connected Stripe account: ${error.message}`,
        },
        { status: 400 },
      )
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

    // STEP 5: Get bundle details (bundleContent is already in purchase document)
    let bundleData = null
    if (purchaseData.bundleId) {
      console.log(`🔍 [Verify Session] Looking up bundle: ${purchaseData.bundleId}`)
      const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()
        console.log(`✅ [Verify Session] Retrieved bundle data: ${bundleData?.title}`)
      } else {
        console.error(`❌ [Verify Session] Bundle not found: ${purchaseData.bundleId}`)
      }
    }

    // STEP 6: Get creator details
    let creatorData = null
    if (purchaseData.creatorId) {
      console.log(`🔍 [Verify Session] Looking up creator: ${purchaseData.creatorId}`)
      const creatorDoc = await db.collection("users").doc(purchaseData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
        console.log(`✅ [Verify Session] Retrieved creator data: ${creatorData?.displayName}`)
      } else {
        console.error(`❌ [Verify Session] Creator not found: ${purchaseData.creatorId}`)
      }
    }

    // STEP 7: Return verification success with new data structure
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
        sessionId: purchaseData.sessionId,
        paymentIntentId: purchaseData.paymentIntentId,
        userId: purchaseData.buyerUid,
        bundleId: purchaseData.bundleId,
        creatorId: purchaseData.creatorId,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: purchaseData.status,
        webhookProcessed: purchaseData.webhookProcessed,
        timestamp: purchaseData.timestamp,
        // Bundle content is already stored in purchase document
        bundleContent: purchaseData.bundleContent || [],
      },
      bundle: bundleData
        ? {
            id: purchaseData.bundleId,
            title: bundleData.title,
            description: bundleData.description,
            thumbnailUrl: bundleData.thumbnailUrl,
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
      bundleTitle: response.bundle?.title,
      creatorName: response.bundle?.creator?.name,
      contentItems: response.purchase.bundleContent?.length || 0,
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
