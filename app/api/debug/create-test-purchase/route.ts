import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Create Test Purchase] Starting test purchase creation`)

    // Get Firebase auth token from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Create Test Purchase] No auth token provided")
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
      console.log(`✅ [Create Test Purchase] Token verified for user: ${decodedToken.uid}`)
    } catch (error) {
      console.log("❌ [Create Test Purchase] Invalid token:", error)
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 })
    }

    const { productBoxId, price = 9.99 } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    const userId = decodedToken.uid

    // Get user profile for additional data
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    // Get product box data
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    const productBoxData = productBoxDoc.data()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const purchaseId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    // Create comprehensive purchase record
    const purchaseData = {
      // Core purchase info
      id: purchaseId,
      userId: userId,
      type: "product_box",
      status: "completed",

      // Product info
      itemId: productBoxId,
      productBoxId: productBoxId,
      itemTitle: productBoxData?.title || "Test Product Box",
      itemDescription: productBoxData?.description || "Test purchase for debugging",

      // Creator info
      creatorId: productBoxData?.creatorId || "unknown",
      creatorName: productBoxData?.creatorName || "Test Creator",
      creatorUsername: productBoxData?.creatorUsername || "testcreator",

      // Payment info
      price: price,
      currency: "usd",

      // Timestamps
      createdAt: now,
      updatedAt: now,
      purchasedAt: now,

      // Test metadata
      isTestPurchase: true,
      testCreatedBy: userId,
      testCreatedAt: now.toISOString(),

      // Stripe simulation
      stripeSessionId: `cs_test_${Math.random().toString(36).substr(2, 20)}`,
      paymentIntentId: `pi_test_${Math.random().toString(36).substr(2, 20)}`,

      // Additional metadata
      metadata: {
        productBoxId: productBoxId,
        testPurchase: true,
        debugInfo: {
          userEmail: userData?.email || decodedToken.email,
          userName: userData?.displayName || decodedToken.name,
          createdVia: "debug-api",
        },
      },
    }

    console.log(`🔍 [Create Test Purchase] Creating purchase record:`, purchaseData)

    // Create purchase in main collection
    await db.collection("purchases").doc(purchaseId).set(purchaseData)
    console.log(`✅ [Create Test Purchase] Created in main purchases collection`)

    // Also create in user subcollection
    await db.collection("users").doc(userId).collection("purchases").doc(purchaseId).set(purchaseData)
    console.log(`✅ [Create Test Purchase] Created in user subcollection`)

    // Log the purchase for tracking
    await db.collection("purchaseLogs").add({
      purchaseId: purchaseId,
      userId: userId,
      productBoxId: productBoxId,
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
      data: purchaseData,
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
