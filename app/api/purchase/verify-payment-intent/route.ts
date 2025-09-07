import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Payment Intent] Starting payment intent verification")

    const body = await request.json()
    const { paymentIntentId, accountId } = body

    if (!paymentIntentId) {
      console.error("❌ [Verify Payment Intent] No payment intent ID provided")
      return NextResponse.json({ success: false, error: "Payment intent ID is required" }, { status: 400 })
    }

    // Get authenticated user
    let userId = null
    try {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log(`✅ [Verify Payment Intent] Authenticated user: ${userId}`)
      }
    } catch (authError) {
      console.warn(`⚠️ [Verify Payment Intent] Auth verification failed:`, authError)
    }

    console.log(`🔍 [Verify Payment Intent] Verifying payment intent: ${paymentIntentId}`)

    // STEP 1: Look for bundle slot purchase in bundleSlotPurchases collection
    console.log(`🔍 [Verify Payment Intent] Looking up bundle slot purchase`)

    const purchaseQuery = await db
      .collection("bundleSlotPurchases")
      .where("paymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get()

    let purchaseDoc = null
    let purchaseData = null

    if (!purchaseQuery.empty) {
      purchaseDoc = purchaseQuery.docs[0]
      purchaseData = purchaseDoc.data()
      console.log(`✅ [Verify Payment Intent] Found bundle slot purchase document`)
    }

    if (!purchaseData) {
      console.error(`❌ [Verify Payment Intent] No bundle slot purchase found for payment intent: ${paymentIntentId}`)
      return NextResponse.json(
        {
          success: false,
          error: "Purchase not found",
          details: "Bundle slot purchase not found. The webhook may still be processing.",
        },
        { status: 404 },
      )
    }

    console.log(`✅ [Verify Payment Intent] Found bundle slot purchase:`, {
      paymentIntentId: purchaseData.paymentIntentId,
      buyerUid: purchaseData.buyerUid,
      bundleSlots: purchaseData.bundleSlots,
      status: purchaseData.status,
      bundleTier: purchaseData.bundleTier,
    })

    // STEP 2: Verify payment intent with Stripe
    let paymentIntent = null
    try {
      console.log(`🔍 [Verify Payment Intent] Retrieving payment intent from Stripe`)
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        stripeAccount: accountId || undefined,
      })
      console.log(`✅ [Verify Payment Intent] Retrieved payment intent from Stripe`)
    } catch (error: any) {
      console.error(`❌ [Verify Payment Intent] Failed to retrieve payment intent: ${error.message}`)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify payment",
          details: error.message,
        },
        { status: 400 },
      )
    }

    // STEP 3: Validate payment status
    if (paymentIntent.status !== "succeeded") {
      console.error(`❌ [Verify Payment Intent] Payment not succeeded: ${paymentIntent.status}`)
      return NextResponse.json(
        {
          success: false,
          error: "Payment not completed",
          paymentStatus: paymentIntent.status,
        },
        { status: 400 },
      )
    }

    // STEP 4: Build response for bundle slot purchase
    const response = {
      success: true,
      purchase: {
        id: purchaseDoc?.id,
        paymentIntentId: purchaseData.paymentIntentId,
        sessionId: purchaseData.sessionId,
        userId: purchaseData.buyerUid,
        bundleSlots: purchaseData.bundleSlots,
        bundleTier: purchaseData.bundleTier,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        status: purchaseData.status,
        type: "bundle_slot_purchase",
        createdAt: purchaseData.createdAt,
        completedAt: purchaseData.completedAt,
      },
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountReceived: paymentIntent.amount_received,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        receiptEmail: paymentIntent.receipt_email,
      },
      productBox: {
        id: "bundle_slots",
        title: `${purchaseData.bundleSlots} Extra Bundle${purchaseData.bundleSlots > 1 ? "s" : ""}`,
        description: `Purchase of ${purchaseData.bundleSlots} additional bundle creation slot${purchaseData.bundleSlots > 1 ? "s" : ""}`,
        price: purchaseData.amount,
      },
      verificationDetails: {
        method: "payment_intent_direct",
        verifiedAt: new Date().toISOString(),
        connectedAccount: accountId || null,
        duplicateCheck: false,
      },
      message: `Successfully purchased ${purchaseData.bundleSlots} extra bundle slot${purchaseData.bundleSlots > 1 ? "s" : ""}!`,
    }

    console.log(`✅ [Verify Payment Intent] Verification successful for bundle slot purchase`)
    console.log(`📊 [Verify Payment Intent] Response summary:`, {
      paymentIntentId: response.paymentIntent.id,
      amount: response.paymentIntent.amount,
      bundleSlots: response.purchase.bundleSlots,
      bundleTier: response.purchase.bundleTier,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Verify Payment Intent] Verification error:", error)
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
