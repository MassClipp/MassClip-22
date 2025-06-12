import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db, FieldValue } from "@/lib/firebase-admin"

// Initialize Stripe with error handling
let stripe: Stripe
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set")
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  })
} catch (error) {
  console.error("❌ [Stripe] Failed to initialize:", error)
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Purchase] Starting verification...")

    // Check if Stripe is initialized
    if (!stripe) {
      console.error("❌ [Verify Purchase] Stripe not initialized")
      return NextResponse.json(
        {
          error: "Payment system not configured properly",
        },
        { status: 500 },
      )
    }

    // Check if Firebase is initialized
    if (!db || !FieldValue) {
      console.error("❌ [Verify Purchase] Firebase not initialized properly")
      return NextResponse.json(
        {
          error: "Database not configured properly",
        },
        { status: 500 },
      )
    }

    const { sessionId, idToken } = await request.json()

    console.log("📝 [Verify Purchase] Request data:", { sessionId, hasIdToken: !!idToken })

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Verify user authentication
    let userId: string
    try {
      if (!idToken) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log("✅ [Verify Purchase] User authenticated:", userId)
    } catch (error) {
      console.error("❌ [Verify Purchase] Auth error:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Retrieve the Stripe session
    let session: Stripe.Checkout.Session
    try {
      console.log("🔍 [Verify Purchase] Retrieving Stripe session:", sessionId)
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"], // Expand to get more details
      })

      // CRITICAL: Log the full session for debugging
      console.log("📊 [Verify Purchase] Full Stripe session:", {
        id: session.id,
        payment_status: session.payment_status,
        metadata: session.metadata,
        client_reference_id: session.client_reference_id,
        amount_total: session.amount_total,
        currency: session.currency,
      })
    } catch (error) {
      console.error("❌ [Verify Purchase] Stripe session error:", error)
      return NextResponse.json(
        {
          error: "Failed to retrieve payment session",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      console.log("❌ [Verify Purchase] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
        },
        { status: 400 },
      )
    }

    // DEFENSIVE CHECK: Ensure metadata exists and has productBoxId
    console.log("🔍 [Verify Purchase] Checking metadata:", session.metadata)

    if (!session.metadata) {
      console.error("❌ [Verify Purchase] No metadata found in session")
      return NextResponse.json(
        {
          error: "Payment session missing required information",
          debug: "No metadata found",
        },
        { status: 400 },
      )
    }

    const productBoxId = session.metadata.productBoxId
    if (!productBoxId) {
      console.error("❌ [Verify Purchase] Missing productBoxId in session metadata:", session.metadata)
      return NextResponse.json(
        {
          error: "Product information missing from payment session",
          debug: `Metadata keys: ${Object.keys(session.metadata).join(", ")}`,
        },
        { status: 400 },
      )
    }

    console.log("✅ [Verify Purchase] Product box ID found:", productBoxId)

    // Check if this purchase has already been recorded
    const existingPurchaseQuery = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty) {
      console.log("ℹ️ [Verify Purchase] Purchase already recorded")
      const existingPurchase = existingPurchaseQuery.docs[0].data()

      // Get product box details for response
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      const productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: {
          id: existingPurchaseQuery.docs[0].id,
          productBoxId,
          sessionId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || "usd",
          itemTitle: productBoxData?.title || session.metadata.productTitle || "Product Box",
          purchasedAt: existingPurchase.timestamp?.toDate() || new Date(),
        },
      })
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Verify Purchase] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log("✅ [Verify Purchase] Product box found:", productBoxData.title)

    // Record the purchase in Firestore
    try {
      const purchaseData = {
        productBoxId,
        sessionId,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        timestamp: FieldValue.serverTimestamp(), // ✅ Using imported FieldValue
        status: "completed",
        metadata: session.metadata, // Store full metadata for debugging
      }

      console.log("💾 [Verify Purchase] Recording purchase:", purchaseData)

      const purchaseRef = await db.collection("users").doc(userId).collection("purchases").add(purchaseData)

      console.log("✅ [Verify Purchase] Purchase recorded with ID:", purchaseRef.id)

      // Update product box sales counter
      await db
        .collection("productBoxes")
        .doc(productBoxId)
        .update({
          totalSales: FieldValue.increment(1), // ✅ Using imported FieldValue
          totalRevenue: FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0), // ✅ Using imported FieldValue
        })

      console.log("✅ [Verify Purchase] Sales counters updated")

      return NextResponse.json({
        success: true,
        purchase: {
          id: purchaseRef.id,
          productBoxId,
          sessionId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || "usd",
          itemTitle: productBoxData.title || session.metadata.productTitle || "Product Box",
          itemDescription: productBoxData.description,
          thumbnailUrl: productBoxData.thumbnailUrl,
          purchasedAt: new Date(),
          status: "completed",
        },
      })
    } catch (error) {
      console.error("❌ [Verify Purchase] Firestore error:", error)
      return NextResponse.json(
        {
          error: "Failed to record purchase",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Verify Purchase] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
