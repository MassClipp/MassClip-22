import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, userId, creatorId, idToken } = await request.json()

    if (!productBoxId || !userId) {
      return NextResponse.json({ error: "Product Box ID and User ID are required" }, { status: 400 })
    }

    // Verify Firebase ID token if provided
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        if (decodedToken.uid !== userId) {
          return NextResponse.json({ error: "User ID mismatch" }, { status: 401 })
        }
        console.log(`✅ [Recent Purchase] Token verified for user: ${userId}`)
      } catch (tokenError) {
        console.error("❌ [Recent Purchase] Token verification failed:", tokenError)
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    }

    // Look for recent purchases (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const recentPurchasesQuery = await db
      .collection("purchases")
      .where("productBoxId", "==", productBoxId)
      .where("userId", "==", userId)
      .where("status", "==", "completed")
      .where("createdAt", ">=", twentyFourHoursAgo)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()

    if (recentPurchasesQuery.empty) {
      return NextResponse.json({ error: "No recent purchase found for this product" }, { status: 404 })
    }

    const purchaseDoc = recentPurchasesQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    const productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

    // Ensure user has access
    const userRef = db.collection("users").doc(userId)
    await userRef.update({
      [`productBoxAccess.${productBoxId}`]: {
        purchaseId: purchaseDoc.id,
        sessionId: purchaseData.sessionId || null,
        grantedAt: new Date(),
        amount: purchaseData.amount || 0,
        currency: purchaseData.currency || "usd",
      },
      updatedAt: new Date(),
    })

    console.log(`✅ [Recent Purchase] Access confirmed for user: ${userId}`)

    return NextResponse.json({
      success: true,
      session: {
        id: purchaseData.sessionId || purchaseDoc.id,
        amount: purchaseData.amount || 0,
        currency: purchaseData.currency || "usd",
        status: "paid",
        customer_email: purchaseData.customerEmail,
        payment_intent: purchaseData.paymentIntentId,
      },
      purchase: {
        productBoxId,
        userId,
        connectedAccountId: purchaseData.metadata?.connectedAccountId,
        purchaseId: purchaseDoc.id,
      },
      productBox: {
        title: productBoxData?.title,
        description: productBoxData?.description,
        creatorId: productBoxData?.creatorId,
      },
    })
  } catch (error: any) {
    console.error("❌ [Recent Purchase] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify recent purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
