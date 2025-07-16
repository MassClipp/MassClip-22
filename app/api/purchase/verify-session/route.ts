import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    console.log("📝 [Verify Session] Request body:", { ...body, idToken: "[REDACTED]" })

    const { sessionId, idToken } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Verify Firebase token if provided (user might not be logged in for anonymous purchases)
    let userId = null
    if (idToken) {
      try {
        console.log("🔐 [Verify Session] Verifying Firebase token...")
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Verify Session] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Verify Session] Token verification failed:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    // Retrieve session from Stripe
    console.log("💳 [Verify Session] Retrieving Stripe session:", sessionId)
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log("✅ [Verify Session] Session retrieved:", {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
      })
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve session:", error)
      return NextResponse.json(
        {
          error: "Invalid session ID",
          details: error.message,
        },
        { status: 400 },
      )
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Session] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          paymentStatus: session.payment_status,
        },
        { status: 400 },
      )
    }

    const productBoxId = session.metadata?.productBoxId
    const sessionUserId = session.metadata?.userId

    if (!productBoxId) {
      console.error("❌ [Verify Session] Missing productBoxId in session metadata")
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    // Use userId from token if available, otherwise use session metadata
    const finalUserId = userId || sessionUserId

    console.log("📦 [Verify Session] Processing purchase:", {
      productBoxId,
      userId: finalUserId,
      sessionUserId,
      amount: session.amount_total,
    })

    // Check if purchase already exists
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    let purchaseId
    let alreadyProcessed = false

    if (!existingPurchaseQuery.empty) {
      console.log("ℹ️ [Verify Session] Purchase already exists")
      purchaseId = existingPurchaseQuery.docs[0].id
      alreadyProcessed = true
    } else {
      // Create new purchase record
      console.log("💾 [Verify Session] Creating new purchase record...")
      const purchaseData = {
        sessionId,
        productBoxId,
        userId: finalUserId,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        customerEmail: session.customer_details?.email || null,
        createdAt: new Date(),
        stripeSessionId: sessionId,
        paymentStatus: session.payment_status,
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      purchaseId = purchaseRef.id
      console.log("✅ [Verify Session] Purchase record created:", purchaseId)

      // Grant user access to product box if user is authenticated
      if (finalUserId) {
        console.log("🔓 [Verify Session] Granting user access...")
        try {
          await db.collection("users").doc(finalUserId).collection("purchases").doc(purchaseId).set({
            productBoxId,
            purchaseId,
            sessionId,
            amount: session.amount_total,
            purchasedAt: new Date(),
            status: "active",
          })
          console.log("✅ [Verify Session] User access granted")
        } catch (error) {
          console.error("❌ [Verify Session] Failed to grant user access:", error)
        }
      }
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    const productBox = productBoxDoc.exists ? productBoxDoc.data() : {}

    console.log("✅ [Verify Session] Verification completed successfully")

    return NextResponse.json({
      success: true,
      alreadyProcessed,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
      },
      purchase: {
        id: purchaseId,
        productBoxId,
        userId: finalUserId,
        amount: session.amount_total || 0,
      },
      productBox: {
        title: productBox?.title || "Product Box",
        description: productBox?.description,
      },
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
