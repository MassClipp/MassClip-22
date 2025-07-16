import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Retrieve session from Stripe
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      })
    } catch (error: any) {
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
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
        },
        { status: 400 },
      )
    }

    const { userId, productBoxId, creatorId } = session.metadata!

    // Verify user if token provided
    let authenticatedUserId = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        authenticatedUserId = decodedToken.uid

        // Ensure the session belongs to the authenticated user
        if (authenticatedUserId !== userId) {
          return NextResponse.json({ error: "Session does not belong to authenticated user" }, { status: 403 })
        }
      } catch (error) {
        console.warn("Token verification failed, proceeding without authentication")
      }
    }

    // Check if purchase already exists
    const existingPurchase = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchase.empty) {
      const purchaseData = existingPurchase.docs[0].data()
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: {
          id: existingPurchase.docs[0].id,
          productBoxId: purchaseData.productBoxId,
          amount: purchaseData.amount,
          status: purchaseData.status,
        },
      })
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!

    // Create purchase record
    const purchaseData = {
      sessionId,
      productBoxId,
      userId: authenticatedUserId || userId,
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      status: "completed",
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
      customerEmail: session.customer_email,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        productTitle: productBox.title,
        creatorId: creatorId || productBox.creatorId,
      },
    }

    const purchaseRef = await db.collection("purchases").add(purchaseData)

    // Grant access to user if authenticated
    if (authenticatedUserId) {
      await db
        .collection("users")
        .doc(authenticatedUserId)
        .update({
          [`purchases.${productBoxId}`]: {
            purchaseId: purchaseRef.id,
            sessionId,
            purchasedAt: FieldValue.serverTimestamp(),
            amount: session.amount_total,
            status: "active",
          },
          updatedAt: FieldValue.serverTimestamp(),
        })
    }

    // Update product box stats
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        "stats.totalSales": FieldValue.increment(1),
        "stats.totalRevenue": FieldValue.increment(session.amount_total || 0),
        "stats.lastSaleAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

    // Update creator stats
    if (creatorId || productBox.creatorId) {
      const targetCreatorId = creatorId || productBox.creatorId
      await db
        .collection("users")
        .doc(targetCreatorId)
        .update({
          "stats.totalSales": FieldValue.increment(1),
          "stats.totalRevenue": FieldValue.increment(session.amount_total || 0),
          "stats.lastSaleAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
        customerEmail: session.customer_email,
      },
      purchase: {
        id: purchaseRef.id,
        productBoxId,
        userId: authenticatedUserId || userId,
        amount: session.amount_total,
      },
      productBox: {
        title: productBox.title,
        description: productBox.description,
      },
    })
  } catch (error: any) {
    console.error("Purchase verification failed:", error)
    return NextResponse.json(
      {
        error: "Purchase verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
