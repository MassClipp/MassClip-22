import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, idToken } = await request.json()

    console.log("🔍 [Verify Purchase] Starting verification:", { sessionId: sessionId?.substring(0, 20) + "..." })

    if (!sessionId) {
      console.error("❌ [Verify Purchase] Missing session ID")
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Verify user if token is provided
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Verify Purchase] User verified:", userId)
      } catch (error) {
        console.error("❌ [Verify Purchase] Error verifying ID token:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    // Retrieve the Stripe session with expanded data
    console.log("🔍 [Verify Purchase] Retrieving Stripe session...")
    let session: Stripe.Checkout.Session

    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })
      console.log("✅ [Verify Purchase] Stripe session retrieved:", {
        id: session.id,
        payment_status: session.payment_status,
        metadata: session.metadata,
      })
    } catch (stripeError: any) {
      console.error("❌ [Verify Purchase] Stripe session retrieval failed:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to retrieve payment session",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }

    if (!session) {
      console.error("❌ [Verify Purchase] Session not found")
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if the session was paid
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Purchase] Payment not completed:", session.payment_status)
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
        },
        { status: 400 },
      )
    }

    // Extract product box ID from metadata
    const productBoxId = session.metadata?.productBoxId
    if (!productBoxId) {
      console.error("❌ [Verify Purchase] Product box ID not found in session metadata:", session.metadata)
      return NextResponse.json({ error: "Product box ID not found in session metadata" }, { status: 400 })
    }

    // Get buyer ID from metadata or use the verified user ID
    const buyerUid = session.metadata?.buyerUid || userId
    if (!buyerUid) {
      console.error("❌ [Verify Purchase] Buyer ID not found")
      return NextResponse.json({ error: "Buyer ID not found" }, { status: 400 })
    }

    console.log("🔍 [Verify Purchase] Processing purchase:", { productBoxId, buyerUid })

    // Check if this purchase has already been recorded
    const existingPurchaseQuery = await db
      .collection("users")
      .doc(buyerUid)
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

      // Get creator details
      const creatorId = productBoxData?.creatorId || session.metadata?.creatorUid
      let creatorUsername = null
      let creatorName = null

      if (creatorId) {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorUsername = creatorData?.username
          creatorName = creatorData?.displayName || creatorData?.name
        }
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: {
          id: existingPurchaseQuery.docs[0].id,
          productBoxId,
          sessionId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || "usd",
          purchasedAt: existingPurchase.timestamp?.toDate() || new Date(),
          status: "completed",
          itemTitle: productBoxData?.title || "Product Box",
          itemDescription: productBoxData?.description,
          thumbnailUrl: productBoxData?.thumbnailUrl,
          creatorUsername,
          creatorName: creatorName || "Unknown Creator",
          type: "product_box",
        },
      })
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Verify Purchase] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }
    const productBoxData = productBoxDoc.data()!

    console.log("📦 [Verify Purchase] Product box found:", productBoxData.title)

    // Record the purchase in the user's purchases subcollection
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
        creatorId: productBoxData.creatorId,
      })

    console.log("✅ [Verify Purchase] Created purchase record:", purchaseRef.id)

    // Increment sales counter on the product box
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
      })

    // Record the sale for the creator
    const creatorId = productBoxData.creatorId || session.metadata?.creatorUid
    if (creatorId) {
      await db
        .collection("users")
        .doc(creatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid,
          sessionId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          platformFee: session.amount_total ? (session.amount_total * 0.05) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.95) / 100 : 0,
          purchasedAt: db.FieldValue.serverTimestamp(),
          status: "completed",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        })
    }

    // Get creator details for the response
    let creatorUsername = null
    let creatorName = null

    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()
        creatorUsername = creatorData?.username
        creatorName = creatorData?.displayName || creatorData?.name
      }
    }

    console.log("✅ [Verify Purchase] Purchase verification completed successfully")

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchaseRef.id,
        productBoxId,
        sessionId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        purchasedAt: new Date(),
        status: "completed",
        itemTitle: productBoxData.title || "Product Box",
        itemDescription: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl,
        creatorUsername,
        creatorName: creatorName || "Unknown Creator",
        type: "product_box",
      },
    })
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
