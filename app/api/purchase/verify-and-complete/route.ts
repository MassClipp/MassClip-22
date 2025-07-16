import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, idToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    if (!productBoxId) {
      return NextResponse.json({ error: "Product Box ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Purchase Verify] Starting verification for session: ${sessionId}`)

    // Retrieve the checkout session from Stripe
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "customer"],
      })
      console.log(`✅ [Purchase Verify] Session retrieved:`, {
        id: session.id,
        status: session.payment_status,
        amount: session.amount_total,
        customer: session.customer_email,
      })
    } catch (stripeError: any) {
      console.error("❌ [Purchase Verify] Failed to retrieve Stripe session:", stripeError)
      return NextResponse.json(
        {
          error: "Invalid session ID or session not found",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    // Verify the session was completed successfully
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
        },
        { status: 400 },
      )
    }

    // Get user information if authenticated
    let userId = null
    let userEmail = null

    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email
        console.log(`✅ [Purchase Verify] User authenticated: ${userId}`)
      } catch (authError) {
        console.log("⚠️ [Purchase Verify] Token verification failed, proceeding as anonymous")
      }
    }

    // Use customer email from Stripe if no authenticated user
    if (!userEmail && session.customer_email) {
      userEmail = session.customer_email
    }

    // Verify the product box exists
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    console.log(`✅ [Purchase Verify] Product box found: ${productBoxData?.title}`)

    // Check if purchase already exists to prevent duplicates
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    let purchaseId
    if (!existingPurchaseQuery.empty) {
      purchaseId = existingPurchaseQuery.docs[0].id
      console.log(`ℹ️ [Purchase Verify] Purchase already exists: ${purchaseId}`)
    } else {
      // Create new purchase record
      const purchaseData = {
        sessionId,
        productBoxId,
        userId: userId || null,
        userEmail: userEmail || null,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        customerEmail: session.customer_email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: {
          stripeSessionId: sessionId,
          productBoxTitle: productBoxData?.title,
          creatorId: productBoxData?.creatorId,
          environment: process.env.NODE_ENV,
        },
      }

      const purchaseRef = await db.collection("purchases").add(purchaseData)
      purchaseId = purchaseRef.id
      console.log(`✅ [Purchase Verify] Purchase record created: ${purchaseId}`)
    }

    // Grant access to the user if authenticated
    if (userId) {
      const userRef = db.collection("users").doc(userId)

      // Add to user's purchases
      await userRef.update({
        [`purchases.${productBoxId}`]: {
          purchaseId,
          sessionId,
          purchasedAt: FieldValue.serverTimestamp(),
          amount: session.amount_total,
          status: "active",
        },
        updatedAt: FieldValue.serverTimestamp(),
      })

      console.log(`✅ [Purchase Verify] Access granted to user: ${userId}`)
    }

    // Update product box stats
    await productBoxRef.update({
      "stats.totalSales": FieldValue.increment(1),
      "stats.totalRevenue": FieldValue.increment(session.amount_total || 0),
      "stats.lastSaleAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Update creator stats if creator exists
    if (productBoxData?.creatorId) {
      const creatorRef = db.collection("users").doc(productBoxData.creatorId)
      await creatorRef.update({
        "stats.totalSales": FieldValue.increment(1),
        "stats.totalRevenue": FieldValue.increment(session.amount_total || 0),
        "stats.lastSaleAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    console.log(`🎉 [Purchase Verify] Purchase completed successfully`)

    // Return success response
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: session.payment_status,
        customer_email: session.customer_email,
        payment_intent:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      },
      purchase: {
        productBoxId,
        userId: userId || null,
        purchaseId,
        connectedAccountId: session.metadata?.connectedAccountId,
      },
      productBox: {
        title: productBoxData?.title,
        description: productBoxData?.description,
        creatorId: productBoxData?.creatorId,
      },
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Purchase verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
