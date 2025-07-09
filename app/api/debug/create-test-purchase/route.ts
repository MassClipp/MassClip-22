import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Generate a test session ID
    const testSessionId = `cs_test_debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const testPurchaseData = {
      sessionId: testSessionId,
      userId: userId,
      amount: 999, // $9.99
      currency: "usd",
      status: "paid",
      mode: "payment",
      environment: "test_debug",
      purchasedAt: new Date(),
      type: "test_purchase",
      itemTitle: "Debug Test Purchase",
      metadata: {
        type: "debug_test",
        created_by: "debug_tool",
      },
    }

    // Create purchase record in user's purchases collection
    await db.collection("users").doc(userId).collection("purchases").doc(testSessionId).set(testPurchaseData)

    // Also create in unified purchases collection
    await db.collection("userPurchases").doc(userId).collection("purchases").doc(testSessionId).set(testPurchaseData)

    // Create checkout session log
    await db.collection("checkoutSessions").doc(testSessionId).set({
      sessionId: testSessionId,
      userId: userId,
      type: "debug_test",
      status: "completed",
      environment: "test_debug",
      createdAt: new Date(),
      completedAt: new Date(),
      webhookProcessedAt: new Date(),
    })

    console.log(`✅ [DEBUG] Created test purchase for user: ${userId}, session: ${testSessionId}`)

    return NextResponse.json({
      success: true,
      sessionId: testSessionId,
      message: "Test purchase created successfully",
    })
  } catch (error) {
    console.error("Test purchase creation error:", error)
    return NextResponse.json({ error: "Failed to create test purchase" }, { status: 500 })
  }
}
