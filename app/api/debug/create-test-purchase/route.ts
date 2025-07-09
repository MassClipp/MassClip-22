import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Create Test Purchase] Starting test purchase creation`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bundleId, price = 9.99, userId } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    const actualUserId = userId || decodedToken.uid

    // Get user profile for additional data
    const userDoc = await db.collection("users").doc(actualUserId).get()
    const userData = userDoc.data()

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    const bundleData = bundleDoc.data()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const purchaseId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionId = `cs_test_debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    // Create comprehensive purchase record
    const purchaseData = {
      // Core purchase info
      id: purchaseId,
      sessionId: sessionId,
      userId: actualUserId,
      type: "bundle",
      status: "complete",

      // Bundle info
      itemId: bundleId,
      bundleId: bundleId,
      itemTitle: bundleData?.title || "Test Bundle",
      itemDescription: bundleData?.description || "Test bundle purchase for debugging",

      // Creator info
      creatorId: bundleData?.creatorId || "unknown",
      creatorName: bundleData?.creatorName || "Test Creator",
      creatorUsername: bundleData?.creatorUsername || "testcreator",

      // Payment info
      amount: price,
      currency: "usd",

      // Timestamps
      createdAt: now,
      updatedAt: now,
      purchasedAt: now,
      webhookProcessedAt: now,

      // Test metadata
      isTestPurchase: true,
      testCreatedBy: actualUserId,
      testCreatedAt: now.toISOString(),

      // Stripe simulation
      stripeSessionId: sessionId,
      paymentIntentId: `pi_test_${Math.random().toString(36).substr(2, 20)}`,
      paymentStatus: "paid",

      // Additional metadata
      metadata: {
        bundleId: bundleId,
        testPurchase: true,
        debugInfo: {
          userEmail: userData?.email || decodedToken.email,
          userName: userData?.displayName || decodedToken.name,
          createdVia: "debug-api",
        },
      },
    }

    console.log(`🔍 [Create Test Purchase] Creating purchase record:`, {
      sessionId,
      userId: actualUserId,
      bundleId,
      amount: price,
    })

    // Create purchase in user subcollection (using bundleId as doc ID)
    await db.collection("users").doc(actualUserId).collection("purchases").doc(bundleId).set(purchaseData)
    console.log(`✅ [Create Test Purchase] Created in user purchases collection`)

    // Also create in unified purchases collection (using sessionId as doc ID)
    await db.collection("userPurchases").doc(actualUserId).collection("purchases").doc(sessionId).set(purchaseData)
    console.log(`✅ [Create Test Purchase] Created in unified purchases collection`)

    // Log the purchase for tracking
    await db.collection("purchaseLogs").add({
      purchaseId: purchaseId,
      sessionId: sessionId,
      userId: actualUserId,
      bundleId: bundleId,
      action: "test_purchase_created",
      timestamp: now,
      metadata: {
        createdVia: "debug-api",
        userAgent: request.headers.get("user-agent"),
        ip: request.headers.get("x-forwarded-for") || "unknown",
      },
    })

    console.log(`✅ [Create Test Purchase] Test purchase created successfully`)

    return NextResponse.json({
      success: true,
      message: "Test purchase created successfully",
      purchaseId: purchaseId,
      sessionId: sessionId,
      data: {
        sessionId,
        bundleId,
        amount: price,
        userId: actualUserId,
        itemTitle: purchaseData.itemTitle,
      },
    })
  } catch (error) {
    console.error(`❌ [Create Test Purchase] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to create test purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
