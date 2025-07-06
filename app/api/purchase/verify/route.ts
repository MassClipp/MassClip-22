import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { getStripeClientForSession } from "@/lib/stripe-client"

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

    // Get the appropriate Stripe client for this session
    let stripeConfig
    try {
      stripeConfig = getStripeClientForSession(sessionId)
      console.log("✅ [Purchase Verify] Using Stripe client:", {
        mode: stripeConfig.mode,
        keyType: stripeConfig.keyType,
      })
    } catch (configError: any) {
      console.error("❌ [Purchase Verify] Stripe configuration error:", configError.message)
      return NextResponse.json(
        {
          error: "Configuration Error: Test/Live Mode Mismatch",
          details: configError.message,
          sessionType: sessionId.startsWith("cs_test_")
            ? "test"
            : sessionId.startsWith("cs_live_")
              ? "live"
              : "unknown",
          recommendation: "Check your Stripe environment variables and ensure they match the session type",
        },
        { status: 400 },
      )
    }

    // Retrieve the Stripe session with proper error handling
    let session
    try {
      console.log("🔄 [Purchase Verify] Retrieving Stripe session...")
      session = await stripeConfig.client.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })
      console.log("✅ [Purchase Verify] Stripe session retrieved successfully")
    } catch (stripeError: any) {
      console.error("❌ [Purchase Verify] Stripe session retrieval failed:", {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
      })

      if (stripeError.statusCode === 404) {
        return NextResponse.json(
          {
            error: "Payment session not found",
            details: "This could mean the session has expired, is invalid, or there's still a test/live mode mismatch.",
            sessionId: sessionId.substring(0, 20) + "...",
            stripeMode: stripeConfig.mode,
            stripeError: {
              type: stripeError.type,
              code: stripeError.code,
              message: stripeError.message,
            },
            recommendation: `Verify the session exists in your Stripe ${stripeConfig.mode} dashboard`,
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: `Failed to retrieve payment session: ${stripeError.message}`,
          type: stripeError.type,
          code: stripeError.code,
          details: "There was an error communicating with Stripe. Please try again or contact support.",
          stripeMode: stripeConfig.mode,
          recommendation: "Check your Stripe configuration and try again",
        },
        { status: 500 },
      )
    }

    if (!session) {
      console.error("❌ [Purchase Verify] Session is null")
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    console.log("📊 [Purchase Verify] Session details:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      metadata: session.metadata,
      amount_total: session.amount_total,
      currency: session.currency,
      mode: session.mode,
    })

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
        },
        { status: 400 },
      )
    }

    console.log("👤 [Purchase Verify] Buyer UID:", buyerUid)

    // Check if this purchase has already been recorded in the user's purchases subcollection
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
            stripeMode: stripeConfig.mode,
          },
        })
      }
    } catch (firestoreError) {
      console.error("❌ [Purchase Verify] Error checking existing purchases:", firestoreError)
      // Continue with creating new purchase record
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
        },
        { status: 500 },
      )
    }

    // Record the purchase in the user's purchases subcollection
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
        })

      console.log("✅ [Purchase Verify] Created purchase record:", purchaseRef.id)
    } catch (purchaseError) {
      console.error("❌ [Purchase Verify] Error creating purchase record:", purchaseError)
      return NextResponse.json(
        {
          error: "Failed to record purchase",
          details: "The purchase could not be saved to your account.",
        },
        { status: 500 },
      )
    }

    // Increment sales counter on the product box
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
      // Don't fail the entire process for this
    }

    // Record the sale for the creator
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

        // Increment the creator's total sales
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
        // Don't fail the entire process for this
      }
    }

    // Get creator details for the response
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
