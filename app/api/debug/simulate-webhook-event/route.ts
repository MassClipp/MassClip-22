import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventType = "checkout.session.completed", testMode = true } = body

    console.log("🧪 [Webhook Simulation] Starting simulation:", { eventType, testMode })

    // Create a test bundle first
    const testBundleId = `test_bundle_${Date.now()}`
    const testCreatorId = `test_creator_${Date.now()}`
    const testSessionId = `cs_test_${Date.now()}`

    // Create test creator
    await db.collection("users").doc(testCreatorId).set({
      displayName: "Test Creator",
      email: "test@example.com",
      stripeAccountId: "acct_test_123456789",
      createdAt: new Date(),
    })

    // Create test bundle
    await db
      .collection("bundles")
      .doc(testBundleId)
      .set({
        title: "Test Bundle",
        description: "Test bundle for webhook simulation",
        creatorId: testCreatorId,
        price: 2000,
        currency: "usd",
        content: [
          {
            id: "test_video_1",
            title: "Test Video 1",
            fileUrl: "https://example.com/video1.mp4",
            fileSize: 1024000,
            duration: 120,
            mimeType: "video/mp4",
          },
        ],
        createdAt: new Date(),
      })

    // Simulate webhook payload
    const webhookPayload = {
      id: `evt_test_${Date.now()}`,
      object: "event",
      api_version: "2024-06-20",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: testSessionId,
          object: "checkout.session",
          amount_total: 2000,
          currency: "usd",
          payment_status: "paid",
          customer_details: {
            email: "buyer@example.com",
          },
          metadata: {
            creatorId: testCreatorId,
            bundleId: testBundleId,
            buyerUid: "test_buyer_123",
            contentType: "bundle",
          },
          payment_intent: "pi_test_123456789",
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: eventType,
    }

    console.log("🧪 [Webhook Simulation] Created test data:", {
      bundleId: testBundleId,
      creatorId: testCreatorId,
      sessionId: testSessionId,
    })

    // Simulate the webhook processing logic
    const session = webhookPayload.data.object
    const creatorId = session.metadata?.creatorId
    const bundleId = session.metadata?.bundleId
    const buyerUid = session.metadata?.buyerUid

    // Get creator data
    const creatorDoc = await db.collection("users").doc(creatorId!).get()
    const creatorData = creatorDoc.data()

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId!).get()
    const bundleData = bundleDoc.data()

    // Create purchase document
    const purchaseData = {
      sessionId: testSessionId,
      paymentIntentId: session.payment_intent,
      creatorId: creatorId,
      creatorStripeAccountId: creatorData?.stripeAccountId,
      bundleId: bundleId,
      buyerUid: buyerUid,
      status: "completed",
      webhookProcessed: true,
      timestamp: new Date(),
      bundleContent: bundleData?.content || [],
      simulationTest: true,
    }

    await db.collection("bundlePurchases").doc(testSessionId).set(purchaseData)

    console.log("✅ [Webhook Simulation] Purchase document created successfully")

    // Clean up test data
    if (testMode) {
      setTimeout(async () => {
        try {
          await db.collection("bundlePurchases").doc(testSessionId).delete()
          await db.collection("bundles").doc(testBundleId).delete()
          await db.collection("users").doc(testCreatorId).delete()
          console.log("🧹 [Webhook Simulation] Test data cleaned up")
        } catch (cleanupError) {
          console.error("❌ [Webhook Simulation] Cleanup error:", cleanupError)
        }
      }, 30000) // Clean up after 30 seconds
    }

    return NextResponse.json({
      success: true,
      message: "Webhook simulation completed successfully",
      testData: {
        sessionId: testSessionId,
        bundleId: testBundleId,
        creatorId: testCreatorId,
        purchaseCreated: true,
        contentItems: bundleData?.content?.length || 0,
      },
      webhookPayload: webhookPayload,
    })
  } catch (error: any) {
    console.error("❌ [Webhook Simulation] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
