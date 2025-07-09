import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🧪 [Create Test Purchase] Starting test purchase creation`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error(`❌ [Create Test Purchase] Authentication failed`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bundleId, userId, price = 9.99 } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    const actualUserId = userId || decodedToken.uid

    // Generate a debug session ID
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const sessionId = `cs_live_debug_${timestamp}_${randomSuffix}`

    console.log(`🧪 [Create Test Purchase] Creating test purchase:`, {
      sessionId,
      bundleId,
      userId: actualUserId,
      price,
    })

    // Create test purchase data
    const testPurchaseData = {
      id: sessionId,
      sessionId: sessionId,
      stripeSessionId: sessionId,
      bundleId: bundleId,
      userId: actualUserId,
      amount: price,
      currency: "usd",
      status: "complete",
      isTestPurchase: true,
      stripeEnvironment: "debug",
      createdAt: new Date().toISOString(),
      webhookProcessedAt: new Date().toISOString(),
      metadata: {
        testPurchase: true,
        createdBy: "debug-tool",
        bundleId: bundleId,
      },
    }

    // Store in multiple locations for testing
    const batch = db.batch()

    // 1. Store in user's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(actualUserId).collection("purchases").doc(sessionId)
    batch.set(userPurchaseRef, testPurchaseData)

    // 2. Store in unified purchases collection
    const unifiedPurchaseRef = db.collection("userPurchases").doc(actualUserId).collection("purchases").doc(sessionId)
    batch.set(unifiedPurchaseRef, testPurchaseData)

    // 3. Store in debug purchases collection for easy cleanup
    const debugPurchaseRef = db.collection("debugPurchases").doc(sessionId)
    batch.set(debugPurchaseRef, {
      ...testPurchaseData,
      debugCreatedAt: new Date().toISOString(),
      debugCreatedBy: actualUserId,
    })

    // Execute batch write
    await batch.commit()

    console.log(`✅ [Create Test Purchase] Test purchase created successfully: ${sessionId}`)

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      message: "Test purchase created successfully",
      data: {
        sessionId,
        bundleId,
        amount: price,
        status: "complete",
        isTestPurchase: true,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Create Test Purchase] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create test purchase: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
