import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { validateStripeSession } from "@/lib/stripe-client"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Purchase Verify] Starting verification process")

    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      console.error("❌ [Purchase Verify] Missing session ID")
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("📋 [Purchase Verify] Session ID:", sessionId.substring(0, 20) + "...")

    // Verify user if token is provided
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Purchase Verify] User authenticated:", userId)
      } catch (error) {
        console.error("❌ [Purchase Verify] Error verifying ID token:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    // Validate the Stripe session with detailed debug info
    const validation = await validateStripeSession(sessionId)

    if (!validation.success) {
      console.error("❌ [Purchase Verify] Session validation failed:", validation.debug)

      return NextResponse.json(
        {
          error: "Payment session not found",
          details: validation.debug.isNotFound
            ? "The session ID does not exist in your Stripe account"
            : validation.debug.isExpired
              ? "This session has expired"
              : validation.error.message,
          debug: validation.debug,
          sessionType: sessionId.startsWith("cs_test_") ? "test" : "live",
          recommendation: validation.debug.recommendation,
        },
        { status: validation.debug.statusCode || 400 },
      )
    }

    const { session, stripeConfig } = validation
    console.log("✅ [Purchase Verify] Session validated successfully:", validation.debug)

    // Check if the session was paid
    if (session.payment_status !== "paid") {
      console.error("❌ [Purchase Verify] Payment not completed:", {
        payment_status: session.payment_status,
        status: session.status,
      })
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
          sessionStatus: session.status,
          details: "The payment for this session has not been completed successfully.",
          debug: validation.debug,
        },
        { status: 400 },
      )
    }

    // Extract product box ID from metadata
    const productBoxId = session.metadata?.productBoxId
    if (!productBoxId) {
      console.error("❌ [Purchase Verify] Product box ID not found in metadata:", session.metadata)
      return NextResponse.json(
        {
          error: "Product box ID not found in session metadata",
          availableMetadata: Object.keys(session.metadata || {}),
          details: "The purchase session is missing required product information.",
          debug: validation.debug,
        },
        { status: 400 },
      )
    }

    console.log("📦 [Purchase Verify] Product box ID:", productBoxId)

    // Get buyer ID from metadata or use the verified user ID
    const buyerUid = session.metadata?.buyerUid || userId
    if (!buyerUid) {
      console.error("❌ [Purchase Verify] Buyer ID not found")
      return NextResponse.json(
        {
          error: "Buyer ID not found",
          details: "Unable to identify the purchaser for this transaction.",
          debug: validation.debug,
        },
        { status: 400 },
      )
    }

    console.log("👤 [Purchase Verify] Buyer UID:", buyerUid)

    // Check if this purchase has already been recorded
    try {
      const existingPurchaseQuery = await db
        .collection("users")
        .doc(buyerUid)
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get()

      if (!existingPurchaseQuery.empty) {
        console.log("ℹ️ [Purchase Verify] Purchase already recorded")
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
            stripeMode: stripeConfig.mode,
          },
          debug: validation.debug,
        })
      }
    } catch (firestoreError) {
      console.error("❌ [Purchase Verify] Error checking existing purchases:", firestoreError)
    }

    // Get product box details
    let productBoxDoc
    let productBoxData
    try {
      productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (!productBoxDoc.exists) {
        console.error("❌ [Purchase Verify] Product box not found:", productBoxId)
        return NextResponse.json(
          {
            error: "Product box not found",
            productBoxId,
            details: "The purchased product could not be found in our database.",
            debug: validation.debug,
          },
          { status: 404 },
        )
      }
      productBoxData = productBoxDoc.data()!
      console.log("📦 [Purchase Verify] Product box found:", productBoxData.title)
    } catch (productBoxError) {
      console.error("❌ [Purchase Verify] Error fetching product box:", productBoxError)
      return NextResponse.json(
        {
          error: "Failed to fetch product box details",
          details: "There was an error retrieving the product information.",
          debug: validation.debug,
        },
        { status: 500 },
      )
    }

    // Record the purchase
    let purchaseRef
    try {
      purchaseRef = await db
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
          stripeMode: stripeConfig.mode,
          sessionCreated: new Date(session.created * 1000),
          sessionExpires: session.expires_at ? new Date(session.expires_at * 1000) : null,
        })

      console.log("✅ [Purchase Verify] Created purchase record:", purchaseRef.id)
    } catch (purchaseError) {
      console.error("❌ [Purchase Verify] Error creating purchase record:", purchaseError)
      return NextResponse.json(
        {
          error: "Failed to record purchase",
          details: "The purchase could not be saved to your account.",
          debug: validation.debug,
        },
        { status: 500 },
      )
    }

    // Update product box sales
    try {
      await db
        .collection("productBoxes")
        .doc(productBoxId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        })
      console.log("✅ [Purchase Verify] Updated product box sales")
    } catch (updateError) {
      console.error("⚠️ [Purchase Verify] Error updating product box sales:", updateError)
    }

    // Record creator sale
    const creatorId = productBoxData.creatorId || session.metadata?.creatorUid
    if (creatorId) {
      try {
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
            stripeMode: stripeConfig.mode,
          })

        await db
          .collection("users")
          .doc(creatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
          })

        console.log("✅ [Purchase Verify] Recorded creator sale")
      } catch (creatorError) {
        console.error("⚠️ [Purchase Verify] Error recording creator sale:", creatorError)
      }
    }

    // Get creator details for response
    let creatorUsername = null
    let creatorName = null

    if (creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorUsername = creatorData?.username
          creatorName = creatorData?.displayName || creatorData?.name
        }
      } catch (creatorError) {
        console.error("⚠️ [Purchase Verify] Error fetching creator details:", creatorError)
      }
    }

    const purchaseResponse = {
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
        stripeMode: stripeConfig.mode,
      },
      debug: validation.debug,
    }

    console.log("✅ [Purchase Verify] Verification completed successfully")
    return NextResponse.json(purchaseResponse)
  } catch (error) {
    console.error("❌ [Purchase Verify] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    })

    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
