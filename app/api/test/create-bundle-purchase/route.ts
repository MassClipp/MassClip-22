import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const { sessionId, bundleData, contentData } = await request.json()

    if (!sessionId || !bundleData || !contentData) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, bundleData, or contentData" },
        { status: 400 },
      )
    }

    console.log(`[Test API] Creating test bundle purchase with session ID: ${sessionId}`)

    // Create the purchase data matching the webhook structure
    const purchaseData = {
      id: sessionId,
      bundleId: bundleData.id,
      productBoxId: bundleData.id,
      bundleTitle: bundleData.title,
      bundleDescription: bundleData.description,
      bundleThumbnailUrl: bundleData.thumbnailUrl,

      // Creator info
      creatorId: bundleData.creatorId,
      creatorName: bundleData.creatorName,
      creatorUsername: bundleData.creatorUsername,
      creatorDisplayName: bundleData.creatorName,

      // Buyer info - anonymous for testing
      buyerUid: "anonymous",
      userId: "anonymous",
      buyerEmail: "test@example.com",
      buyerName: "Test User (No Auth)",
      buyerDisplayName: "Test User (No Auth)",
      isAuthenticated: false,

      price: bundleData.price,
      amount: bundleData.price,
      purchaseAmount: bundleData.price * 100,
      bundlePrice: bundleData.price,
      currency: bundleData.currency,
      status: "completed",

      // Stripe details - test values
      sessionId: sessionId,
      paymentIntentId: `test_pi_${Date.now()}`,
      stripeCustomerId: `test_cus_${Date.now()}`,

      // Bundle content
      bundleContent: contentData,
      contents: contentData,

      // Content metadata
      itemNames: contentData.map((item: any) => item.title),
      contentCount: contentData.length,
      bundleTotalItems: contentData.length,

      // Calculate totals
      bundleTotalSize: contentData.reduce((total: number, item: any) => total + (item.size || 0), 0),
      bundleTotalDuration: contentData.reduce((total: number, item: any) => total + (item.duration || 0), 0),

      // Timestamps
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      purchasedAt: new Date().toISOString(),
      timestamp: new Date(),

      // Access control
      accessToken: `test_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: "test_api",
      webhookProcessed: true,
      isTestPurchase: true, // Flag to identify test purchases
    }

    // Store in bundlePurchases collection
    await adminDb.collection("bundlePurchases").doc(sessionId).set(purchaseData)

    console.log(`[Test API] Test purchase created successfully: ${sessionId}`)

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Test purchase created successfully",
    })
  } catch (error) {
    console.error("[Test API] Error creating test purchase:", error)
    return NextResponse.json(
      {
        error: "Failed to create test purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
