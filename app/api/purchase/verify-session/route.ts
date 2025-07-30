import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 })
    }

    // Extract and verify Firebase ID token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Verify Session] Firebase token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Verify Session] Firebase token verification failed:", error)
      return NextResponse.json({ success: false, error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    // Check if purchase already exists
    const existingPurchase = await db.collection("bundlePurchases").doc(sessionId).get()
    if (existingPurchase.exists) {
      const purchaseData = existingPurchase.data()!
      console.log("✅ [Verify Session] Purchase already exists:", sessionId)

      // Update the purchase with correct user ID if it was anonymous
      if (purchaseData.userId === "anonymous" && userId) {
        console.log("🔄 [Verify Session] Updating anonymous purchase with user ID:", userId)
        await db
          .collection("bundlePurchases")
          .doc(sessionId)
          .update({
            userId: userId,
            buyerUid: userId,
            userEmail: userEmail,
            userName: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
            isAuthenticated: true,
            updatedAt: new Date(),
          })

        // Also update in main purchases collection
        const mainPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).get()
        for (const doc of mainPurchaseQuery.docs) {
          await doc.ref.update({
            userId: userId,
            buyerUid: userId,
            userEmail: userEmail,
            userName: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
            isAuthenticated: true,
            updatedAt: new Date(),
          })
        }
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: purchaseData,
        item: {
          id: purchaseData.bundleId || purchaseData.productBoxId,
          title: purchaseData.bundleTitle || purchaseData.productTitle,
          description: purchaseData.bundleDescription || purchaseData.productDescription,
        },
      })
    }

    // Retrieve Stripe session
    console.log("🔍 [Verify Session] Retrieving Stripe session:", sessionId)
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve Stripe session:", error)
      return NextResponse.json({ success: false, error: "Invalid session ID" }, { status: 400 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 })
    }

    // Extract bundle/product ID from session metadata
    const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
    if (!bundleId) {
      return NextResponse.json({ success: false, error: "No product information found" }, { status: 400 })
    }

    // Complete the purchase with proper user identification
    console.log("🔄 [Verify Session] Completing purchase for user:", userId)
    const completeResponse = await fetch(`${request.nextUrl.origin}/api/purchase/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buyerUid: userId,
        productBoxId: bundleId,
        sessionId: sessionId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        userEmail: userEmail,
      }),
    })

    if (!completeResponse.ok) {
      const error = await completeResponse.json()
      return NextResponse.json({ success: false, error: error.error || "Failed to complete purchase" }, { status: 500 })
    }

    const completionData = await completeResponse.json()

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      },
      purchase: completionData.purchase,
      item: {
        id: bundleId,
        title: completionData.purchase?.bundleTitle || completionData.purchase?.productTitle,
        description: completionData.purchase?.bundleDescription || completionData.purchase?.productDescription,
      },
    })
  } catch (error) {
    console.error("❌ [Verify Session] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
