import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [API] Starting purchase verification")

    const { sessionId, idToken } = await request.json()

    console.log("📋 [API] Request details:", {
      sessionId: sessionId?.substring(0, 20) + "...",
      hasIdToken: !!idToken,
      sessionType: sessionId?.startsWith("cs_test_") ? "test" : "live",
    })

    if (!sessionId) {
      console.error("❌ [API] Missing session ID")
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Verify user authentication
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [API] User authenticated:", userId)
      } catch (error) {
        console.error("❌ [API] Auth failed:", error)
        return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
      }
    }

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error("❌ [API] Missing Stripe key")
      return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 })
    }

    console.log("🔑 [API] Stripe config:", {
      keyType: stripeKey.startsWith("sk_test_") ? "test" : "live",
      sessionType: sessionId.startsWith("cs_test_") ? "test" : "live",
    })

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-08-16" })

    // Retrieve Stripe session
    let session
    try {
      console.log("📡 [API] Retrieving Stripe session...")
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })

      console.log("✅ [API] Session retrieved:", {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount: session.amount_total,
      })
    } catch (stripeError: any) {
      console.error("❌ [API] Stripe error:", stripeError.message)
      return NextResponse.json(
        {
          error: "Payment session not found",
          details: stripeError.message,
        },
        { status: 404 },
      )
    }

    // Validate payment status
    if (session.payment_status !== "paid") {
      console.error("❌ [API] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
        },
        { status: 400 },
      )
    }

    // Get product info from metadata
    const productBoxId = session.metadata?.productBoxId
    if (!productBoxId) {
      console.error("❌ [API] Missing product box ID")
      return NextResponse.json(
        {
          error: "Product information missing",
        },
        { status: 400 },
      )
    }

    const buyerUid = session.metadata?.buyerUid || userId
    if (!buyerUid) {
      console.error("❌ [API] Missing buyer ID")
      return NextResponse.json(
        {
          error: "Buyer information missing",
        },
        { status: 400 },
      )
    }

    console.log("📦 [API] Purchase details:", {
      productBoxId,
      buyerUid,
      amount: session.amount_total ? session.amount_total / 100 : 0,
    })

    // Check for existing purchase
    const existingPurchase = await db
      .collection("users")
      .doc(buyerUid)
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log("ℹ️ [API] Purchase already exists")
      const purchase = existingPurchase.docs[0].data()

      // Get product details
      const productDoc = await db.collection("productBoxes").doc(productBoxId).get()
      const productData = productDoc.data()

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: {
          id: existingPurchase.docs[0].id,
          productBoxId,
          sessionId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || "usd",
          purchasedAt: purchase.timestamp?.toDate() || new Date(),
          status: "completed",
          itemTitle: productData?.title || "Product Box",
        },
      })
    }

    // Get product details
    const productDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productDoc.exists) {
      console.error("❌ [API] Product not found:", productBoxId)
      return NextResponse.json(
        {
          error: "Product not found",
        },
        { status: 404 },
      )
    }

    const productData = productDoc.data()!
    console.log("📦 [API] Product found:", productData.title)

    // Record the purchase
    const purchaseRef = await db
      .collection("users")
      .doc(buyerUid)
      .collection("purchases")
      .add({
        productBoxId,
        sessionId,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        timestamp: db.FieldValue.serverTimestamp(),
        status: "completed",
        creatorId: productData.creatorId,
      })

    console.log("✅ [API] Purchase recorded:", purchaseRef.id)

    // Update product stats
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
      })

    // Record creator sale
    if (productData.creatorId) {
      await db
        .collection("users")
        .doc(productData.creatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid,
          sessionId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          purchasedAt: db.FieldValue.serverTimestamp(),
          status: "completed",
        })

      console.log("✅ [API] Creator sale recorded")
    }

    const response = {
      success: true,
      purchase: {
        id: purchaseRef.id,
        productBoxId,
        sessionId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        purchasedAt: new Date(),
        status: "completed",
        itemTitle: productData.title || "Product Box",
      },
    }

    console.log("✅ [API] Verification completed successfully")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
