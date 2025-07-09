import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Create Test Purchase] Starting test purchase creation`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bundleId, userId, price = 9.99 } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    const actualUserId = userId || decodedToken.uid

    // Generate session ID based on current Stripe environment
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const sessionPrefix = STRIPE_CONFIG.isLiveMode ? "cs_live_debug" : "cs_test_debug"
    const sessionId = `${sessionPrefix}_${timestamp}_${randomSuffix}`

    // Generate payment intent ID to match
    const paymentIntentPrefix = STRIPE_CONFIG.isLiveMode ? "pi_live" : "pi_test"
    const paymentIntentId = `${paymentIntentPrefix}_${timestamp}_${randomSuffix}`

    console.log(`🔍 [Create Test Purchase] Creating test purchase:`, {
      sessionId,
      bundleId,
      userId: actualUserId,
      stripeMode: STRIPE_CONFIG.isLiveMode ? "LIVE" : "TEST",
    })

    // Check if bundle exists
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    const actualPrice = bundleData?.price || price

    // Create test purchase record
    const purchaseData = {
      id: sessionId,
      sessionId,
      stripeSessionId: sessionId,
      paymentIntentId,
      bundleId,
      userId: actualUserId,
      amount: actualPrice,
      currency: "usd",
      status: "completed",
      paymentStatus: "paid",
      createdAt: new Date(),
      updatedAt: new Date(),
      isTestPurchase: true,
      stripeEnvironment: STRIPE_CONFIG.isLiveMode ? "live" : "test",
      webhookProcessedAt: new Date(), // Mark as processed for testing
      metadata: {
        bundleTitle: bundleData?.title || "Test Bundle",
        createdVia: "debug-tool",
      },
    }

    // Store in multiple locations for comprehensive testing
    const batch = db.batch()

    // 1. User purchases subcollection
    const userPurchaseRef = db.collection("users").doc(actualUserId).collection("purchases").doc(sessionId)
    batch.set(userPurchaseRef, purchaseData)

    // 2. Unified purchases collection
    const unifiedPurchaseRef = db.collection("userPurchases").doc(actualUserId).collection("purchases").doc(sessionId)
    batch.set(unifiedPurchaseRef, purchaseData)

    // 3. Debug purchases collection for easy cleanup
    const debugPurchaseRef = db.collection("debugPurchases").doc(sessionId)
    batch.set(debugPurchaseRef, {
      ...purchaseData,
      debugCreatedAt: new Date(),
      debugCreatedBy: actualUserId,
    })

    await batch.commit()

    console.log(`✅ [Create Test Purchase] Test purchase created successfully: ${sessionId}`)

    return NextResponse.json({
      success: true,
      sessionId,
      paymentIntentId,
      bundleId,
      amount: actualPrice,
      stripeEnvironment: STRIPE_CONFIG.isLiveMode ? "live" : "test",
      message: `Test purchase created with ${STRIPE_CONFIG.isLiveMode ? "live" : "test"} session format`,
    })
  } catch (error) {
    console.error(`❌ [Create Test Purchase] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create test purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
