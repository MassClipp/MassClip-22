import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, bundleId, idToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Only allow mock sessions in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Mock session verification only available in development" }, { status: 403 })
    }

    // Verify it's a mock session
    if (!sessionId.startsWith("cs_test_")) {
      return NextResponse.json(
        { error: "Only mock sessions (cs_test_*) are supported by this endpoint" },
        { status: 400 },
      )
    }

    console.log(`🔍 [Mock Purchase Verify] Starting verification for mock session: ${sessionId}`)

    // Get user information if authenticated
    let userId = null
    let userEmail = null

    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email
        console.log(`✅ [Mock Purchase Verify] User authenticated: ${userId}`)
      } catch (authError) {
        console.log("⚠️ [Mock Purchase Verify] Token verification failed, proceeding as anonymous")
      }
    }

    // Check if purchase already exists to prevent duplicates
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    let purchaseId
    if (!existingPurchaseQuery.empty) {
      purchaseId = existingPurchaseQuery.docs[0].id
      console.log(`ℹ️ [Mock Purchase Verify] Purchase already exists: ${purchaseId}`)
    } else {
      // Create new purchase record for mock session
      const purchaseData = {
        sessionId,
        bundleId,
        userId: userId || null,
        userEmail: userEmail || null,
        amount: 2999, // Mock amount
        currency: "usd",
        status: "completed",
        paymentIntentId: `pi_mock_${Math.random().toString(36).substring(2, 15)}`,
        customerEmail: userEmail || "test@example.com",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: {
          stripeSessionId: sessionId,
          bundleId: bundleId,
          environment: process.env.NODE_ENV,
          mockSession: true,
        },
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      purchaseId = purchaseRef.id
      console.log(`✅ [Mock Purchase Verify] Mock purchase record created: ${purchaseId}`)
    }

    // Grant access to the user if authenticated
    if (userId) {
      const userRef = db.collection("users").doc(userId)

      // Add to user's purchases
      await userRef.update({
        [`purchases.${bundleId}`]: {
          purchaseId,
          sessionId,
          purchasedAt: FieldValue.serverTimestamp(),
          amount: 2999,
          status: "active",
          mockPurchase: true,
        },
        updatedAt: FieldValue.serverTimestamp(),
      })

      console.log(`✅ [Mock Purchase Verify] Access granted to user: ${userId}`)
    }

    console.log(`🎉 [Mock Purchase Verify] Mock purchase completed successfully`)

    // Return success response
    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        amount: 2999,
        currency: "usd",
        status: "paid",
        customer_email: userEmail || "test@example.com",
        payment_intent: `pi_mock_${Math.random().toString(36).substring(2, 15)}`,
      },
      purchase: {
        bundleId,
        userId: userId || null,
        purchaseId,
        mockPurchase: true,
      },
      bundle: {
        id: bundleId,
        title: "Mock Bundle",
        description: "This is a mock bundle for testing purposes",
      },
    })
  } catch (error: any) {
    console.error("❌ [Mock Purchase Verify] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Mock purchase verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
