import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Verify user if token is provided
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
      } catch (error) {
        console.error("Error verifying ID token:", error)
        // Continue without user verification
      }
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if the session was paid
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed", status: session.payment_status }, { status: 400 })
    }

    // Extract product box ID from metadata
    const productBoxId = session.metadata?.productBoxId
    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID not found in session metadata" }, { status: 400 })
    }

    // Get buyer ID from metadata or use the verified user ID
    const buyerUid = session.metadata?.buyerUid || userId
    if (!buyerUid) {
      return NextResponse.json({ error: "Buyer ID not found" }, { status: 400 })
    }

    // Check if this purchase has already been recorded in the user's purchases subcollection
    const existingPurchaseQuery = await db
      .collection("users")
      .doc(buyerUid)
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty) {
      // Purchase already recorded, return success with existing data
      const existingPurchase = existingPurchaseQuery.docs[0].data()

      // Get product box details
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
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }
    const productBoxData = productBoxDoc.data()!

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

    console.log("✅ [Purchase Verify] Created purchase record:", purchaseRef.id)

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
    console.error("Error verifying purchase:", error)
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 })
  }
}
