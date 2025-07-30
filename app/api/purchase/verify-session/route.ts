import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import { retrieveSessionSmart } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, productBoxId } = body

    console.log("🔍 [Purchase Verify] Verifying session:", { sessionId, productBoxId })

    // Get authenticated user
    const headers = Object.fromEntries(request.headers.entries())
    const user = await getAuthenticatedUser(headers)
    console.log("✅ [Purchase Verify] Authenticated user:", user.uid)

    // First check if we already have a purchase record
    const existingPurchaseQuery = await adminDb
      .collection("purchases")
      .where("buyerUid", "==", user.uid)
      .where("productBoxId", "==", productBoxId)
      .where("sessionId", "==", sessionId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty) {
      console.log("✅ [Purchase Verify] Purchase already verified and recorded")
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Purchase already verified",
        purchaseId: existingPurchaseQuery.docs[0].id,
      })
    }

    // Get product box to find creator's Stripe account
    const productBoxDoc = await adminDb.collection("product_boxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Purchase Verify] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    const creatorDoc = await adminDb.collection("users").doc(productBox.creatorId).get()
    const creator = creatorDoc.data()
    const connectedAccountId = creator?.stripeAccountId

    console.log("🔍 [Purchase Verify] Creator info:", {
      creatorId: productBox.creatorId,
      connectedAccountId,
    })

    // Try to retrieve session from connected account first, then platform
    let session
    try {
      session = await retrieveSessionSmart(sessionId, connectedAccountId)
      console.log("✅ [Purchase Verify] Session retrieved:", {
        id: session.id,
        payment_status: session.payment_status,
        metadata: session.metadata,
      })
    } catch (error) {
      console.error("❌ [Purchase Verify] Failed to retrieve session:", error)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify the session belongs to this user and product
    const sessionBuyerUid = session.metadata?.buyerUid || session.client_reference_id
    const sessionProductBoxId = session.metadata?.productBoxId

    console.log("🔍 [Purchase Verify] Session verification:", {
      sessionBuyerUid,
      expectedBuyerUid: user.uid,
      sessionProductBoxId,
      expectedProductBoxId: productBoxId,
      paymentStatus: session.payment_status,
    })

    if (sessionBuyerUid !== user.uid) {
      console.error("❌ [Purchase Verify] Session buyer UID mismatch")
      return NextResponse.json({ error: "Session does not belong to user" }, { status: 403 })
    }

    if (sessionProductBoxId !== productBoxId) {
      console.error("❌ [Purchase Verify] Session product box ID mismatch")
      return NextResponse.json({ error: "Session does not match product" }, { status: 403 })
    }

    if (session.payment_status !== "paid") {
      console.error("❌ [Purchase Verify] Session not paid:", session.payment_status)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Create purchase record since verification passed
    const purchaseData = {
      buyerUid: user.uid,
      productBoxId,
      creatorId: productBox.creatorId,
      sessionId,
      connectedAccountId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      status: "completed",
      purchasedAt: new Date(),
      buyerEmail: user.email,
      buyerName: user.displayName || "",
      customerDetails: session.customer_details,
      paymentIntentId: session.payment_intent,
      metadata: {
        ...session.metadata,
        source: "manual_verification",
        verifiedAt: new Date().toISOString(),
      },
    }

    console.log("💾 [Purchase Verify] Creating purchase record")
    const purchaseRef = adminDb.collection("purchases").doc()
    await purchaseRef.set(purchaseData)

    // Update user's purchase list
    const userPurchasesRef = adminDb.collection("users").doc(user.uid).collection("purchases").doc(productBoxId)
    await userPurchasesRef.set({
      productBoxId,
      purchaseId: purchaseRef.id,
      purchasedAt: new Date(),
      amount: purchaseData.amount,
      currency: purchaseData.currency,
      sessionId,
      status: "completed",
    })

    console.log("✅ [Purchase Verify] Purchase verified and recorded:", purchaseRef.id)

    return NextResponse.json({
      success: true,
      verified: true,
      purchaseId: purchaseRef.id,
      message: "Purchase verified successfully",
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Error:", error)
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
