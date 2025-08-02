import { type NextRequest, NextResponse } from "next/server"
import { retrieveSessionSmart } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, buyerUid } = await request.json()

    console.log("🔍 [Session Verification] Verifying session with buyer identification:", { sessionId, buyerUid })

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    if (!buyerUid) {
      return NextResponse.json({ error: "Buyer UID is required for access verification" }, { status: 400 })
    }

    // Check if purchase already exists
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(buyerUid, sessionId)
    if (existingPurchase) {
      console.log("✅ [Session Verification] Purchase already exists:", sessionId)
      return NextResponse.json({
        success: true,
        purchase: existingPurchase,
        message: "Access already granted",
      })
    }

    // Retrieve session from Stripe with smart account detection
    let session: any
    let connectedAccountId: string | undefined

    try {
      // First, try to find which connected account this session belongs to
      // by checking the metadata for creator information
      const sessionMetadata = await getSessionMetadata(sessionId)

      if (sessionMetadata?.creatorId) {
        const creatorDoc = await db.collection("users").doc(sessionMetadata.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()!
          connectedAccountId = creatorData.stripeAccountId
        }
      }

      // Retrieve session using smart method
      session = await retrieveSessionSmart(sessionId, connectedAccountId)

      console.log("✅ [Session Verification] Session retrieved:", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        connectedAccount: connectedAccountId,
        metadata: session.metadata,
      })
    } catch (error: any) {
      console.error("❌ [Session Verification] Failed to retrieve session:", error)
      return NextResponse.json({ error: "Session not found or invalid" }, { status: 404 })
    }

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      console.log("⚠️ [Session Verification] Payment not completed:", session.payment_status)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // CRITICAL: Verify buyer UID matches session metadata
    const sessionBuyerUid = session.metadata?.buyerUid
    if (sessionBuyerUid && sessionBuyerUid !== buyerUid) {
      console.error("❌ [Session Verification] Buyer UID mismatch:", {
        provided: buyerUid,
        inSession: sessionBuyerUid,
      })
      return NextResponse.json({ error: "Unauthorized: Buyer verification failed" }, { status: 403 })
    }

    // Extract purchase details from session metadata
    const { productBoxId, bundleId, creatorId, buyerEmail, buyerName, contentType } = session.metadata || {}

    const itemId = bundleId || productBoxId
    if (!itemId) {
      console.error("❌ [Session Verification] Missing item ID in session metadata")
      return NextResponse.json({ error: "Invalid session: missing item information" }, { status: 400 })
    }

    console.log("✅ [Session Verification] Session metadata validated:", {
      itemId,
      buyerUid,
      buyerEmail,
      creatorId,
      contentType,
    })

    // Create unified purchase record with comprehensive buyer identification
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(buyerUid, {
      [contentType === "bundle" ? "bundleId" : "productBoxId"]: itemId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: creatorId || "",
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || buyerEmail?.split("@")[0] || "User",
    })

    // Also create main purchase record for API compatibility
    const mainPurchaseData = {
      // CRITICAL: Comprehensive buyer identification
      userId: buyerUid,
      buyerUid,
      userEmail: buyerEmail || session.customer_email || "",
      userName: buyerName || buyerEmail?.split("@")[0] || "User",
      isAuthenticated: buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_"),

      // Item identification
      [contentType === "bundle" ? "bundleId" : "productBoxId"]: itemId,
      itemId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,

      // Purchase details
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: contentType || "product_box",

      // Verification details
      verificationMethod: "direct_session_verification_with_buyer_uid",
      verifiedAt: new Date(),
      connectedAccountId: connectedAccountId || null,
    }

    // Save to main purchases collection
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

    // Save to user's personal purchases if authenticated
    if (buyerUid !== "anonymous" && !buyerUid.startsWith("anonymous_")) {
      await db.collection("users").doc(buyerUid).collection("purchases").add(mainPurchaseData)
    }

    console.log("✅ [Session Verification] Purchase verified and access granted:", {
      sessionId: session.id,
      buyerUid,
      itemId,
      purchaseId,
    })

    return NextResponse.json({
      success: true,
      purchase: mainPurchaseData,
      purchaseId,
      message: "Payment verified and access granted",
    })
  } catch (error: any) {
    console.error("❌ [Session Verification] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to verify session" }, { status: 500 })
  }
}

// Helper function to get session metadata without full retrieval
async function getSessionMetadata(sessionId: string): Promise<any> {
  try {
    // Try to find existing purchase record first
    const purchaseDoc = await db.collection("purchases").doc(sessionId).get()
    if (purchaseDoc.exists) {
      const data = purchaseDoc.data()!
      return {
        creatorId: data.creatorId,
        buyerUid: data.buyerUid,
        productBoxId: data.productBoxId,
        bundleId: data.bundleId,
      }
    }

    // If no existing purchase, we'll need to retrieve from Stripe
    // This is a fallback and should be rare
    return null
  } catch (error) {
    console.warn("⚠️ [Session Verification] Could not get session metadata from database:", error)
    return null
  }
}
