import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { STRIPE_CONFIG } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bundleId, userId, price } = await request.json()

    if (!bundleId || !userId) {
      return NextResponse.json({ error: "Bundle ID and User ID are required" }, { status: 400 })
    }

    console.log(`🔍 [Create Test Purchase] Creating test purchase for bundle: ${bundleId}, user: ${userId}`)

    // Check if bundle exists
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    // Generate session ID based on current Stripe environment
    const isLiveMode = STRIPE_CONFIG.isLiveMode
    const sessionPrefix = isLiveMode ? "cs_live_debug" : "cs_test_debug"
    const paymentIntentPrefix = isLiveMode ? "pi_live" : "pi_test"

    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const sessionId = `${sessionPrefix}_${timestamp}_${randomSuffix}`
    const paymentIntentId = `${paymentIntentPrefix}_${timestamp}_${randomSuffix}`

    console.log(`🔍 [Create Test Purchase] Generated session ID: ${sessionId} (${isLiveMode ? "LIVE" : "TEST"} mode)`)

    // Create test purchase data
    const purchaseData = {
      id: sessionId,
      sessionId: sessionId,
      stripeSessionId: sessionId,
      paymentIntentId: paymentIntentId,
      bundleId: bundleId,
      userId: userId,
      amount: price || bundleData.price || 9.99,
      currency: "usd",
      status: "complete",
      itemTitle: bundleData.title || "Test Bundle",
      itemDescription: bundleData.description || "Test purchase for debugging",
      thumbnailUrl: bundleData.customPreviewThumbnail || "",
      createdAt: new Date(),
      purchasedAt: new Date(),
      isTestPurchase: true,
      stripeEnvironment: isLiveMode ? "live" : "test",
      customerEmail: decodedToken.email || "test@example.com",
      webhookProcessedAt: new Date(), // Mark as processed for testing
      webhookEventId: `evt_test_${timestamp}`,
      debugPurchase: true,
    }

    // Store in multiple locations for comprehensive testing
    const batch = db.batch()

    // 1. Store in user's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc(bundleId)
    batch.set(userPurchaseRef, purchaseData)

    // 2. Store in unified purchases collection
    const unifiedPurchaseRef = db.collection("userPurchases").doc(userId).collection("purchases").doc(sessionId)
    batch.set(unifiedPurchaseRef, purchaseData)

    // 3. Store in debug purchases collection for easy cleanup
    const debugPurchaseRef = db.collection("debugPurchases").doc(sessionId)
    batch.set(debugPurchaseRef, {
      ...purchaseData,
      debugCreatedAt: new Date(),
      debugCreatedBy: userId,
    })

    await batch.commit()

    console.log(`✅ [Create Test Purchase] Test purchase created successfully`)

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      bundleId: bundleId,
      amount: purchaseData.amount,
      stripeEnvironment: purchaseData.stripeEnvironment,
      message: `Test purchase created for ${isLiveMode ? "LIVE" : "TEST"} environment`,
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
