import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    if (!idToken) {
      console.error("❌ [Verify Session] Missing idToken")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify Firebase token
    console.log("🔐 [Verify Session] Verifying Firebase token...")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Verify Session] Token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Verify Session] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Retrieve session from Stripe
    console.log("💳 [Verify Session] Retrieving Stripe session:", sessionId)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    console.log("📊 [Verify Session] Session details:", {
      id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total,
    })

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      console.log("⏳ [Verify Session] Payment not completed yet:", session.payment_status)
      return NextResponse.json({
        success: false,
        message: "Payment not completed yet",
        payment_status: session.payment_status,
      })
    }

    // Get metadata from session
    const { productBoxId, creatorId } = session.metadata || {}

    if (!productBoxId) {
      console.error("❌ [Verify Session] Missing productBoxId in session metadata")
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    console.log("📦 [Verify Session] Processing purchase for product:", productBoxId)

    // Check if purchase already exists
    const existingPurchaseQuery = await db
      .collection("purchases")
      .where("userId", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty) {
      console.log("✅ [Verify Session] Purchase already exists, returning success")
      return NextResponse.json({
        success: true,
        message: "Purchase already processed",
        alreadyExists: true,
      })
    }

    // Create purchase record
    console.log("💾 [Verify Session] Creating purchase record...")
    const purchaseData = {
      userId,
      productBoxId,
      creatorId: creatorId || "",
      stripeSessionId: sessionId,
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      customerEmail: session.customer_details?.email || "",
      purchaseDate: new Date(),
      status: "completed",
      paymentStatus: session.payment_status,
    }

    const purchaseRef = await db.collection("purchases").add(purchaseData)
    console.log("✅ [Verify Session] Purchase record created:", purchaseRef.id)

    // Grant user access to product box
    console.log("🔓 [Verify Session] Granting user access...")
    await db.collection("userAccess").doc(`${userId}_${productBoxId}`).set({
      userId,
      productBoxId,
      purchaseId: purchaseRef.id,
      grantedAt: new Date(),
      accessType: "purchased",
    })

    console.log("✅ [Verify Session] Access granted successfully")

    return NextResponse.json({
      success: true,
      message: "Purchase verified and access granted",
      purchaseId: purchaseRef.id,
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
