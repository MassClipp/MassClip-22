import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Purchase Verify] Starting verification process")

    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      console.error("❌ [Purchase Verify] Missing session ID")
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("📋 [Purchase Verify] Session ID:", sessionId.substring(0, 20) + "...")

    // Enhanced mode checking with better logging
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const isTestKey = stripeKey?.startsWith("sk_test_")
    const isLiveKey = stripeKey?.startsWith("sk_live_")
    const isTestSession = sessionId.startsWith("cs_test_")
    const isLiveSession = sessionId.startsWith("cs_live_")

    console.log("🔧 [Purchase Verify] Detailed mode check:", {
      stripeKeyExists: !!stripeKey,
      stripeKeyLength: stripeKey?.length || 0,
      keyType: isTestKey ? "test" : isLiveKey ? "live" : "unknown",
      keyPrefix: stripeKey?.substring(0, 8) || "none",
      sessionType: isTestSession ? "test" : isLiveSession ? "live" : "unknown",
      sessionPrefix: sessionId.substring(0, 8),
      shouldMatch: (isTestKey && isTestSession) || (isLiveKey && isLiveSession),
    })

    // Only trigger mismatch error if there's an ACTUAL mismatch
    const hasMismatch = (isTestKey && isLiveSession) || (isLiveKey && isTestSession)

    if (hasMismatch) {
      console.error("❌ [Purchase Verify] CONFIRMED Test/Live mode mismatch:", {
        keyType: isTestKey ? "test" : "live",
        sessionType: isTestSession ? "test" : "live",
      })
      return NextResponse.json(
        {
          error: "Configuration Error: Test/Live Mode Mismatch",
          details: isTestKey
            ? "You're using a test Stripe key but trying to access a live session."
            : "You're using a live Stripe key but trying to access a test session.",
          sessionType: isTestSession ? "test" : "live",
          keyType: isTestKey ? "test" : "live",
          recommendation: isTestKey
            ? "Either use a live Stripe key or use a test session ID (cs_test_...)"
            : "Either use a test Stripe key or use a live session ID (cs_live_...)",
        },
        { status: 400 },
      )
    }

    console.log("✅ [Purchase Verify] Mode check passed - no mismatch detected")

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

    // Retrieve the Stripe session with enhanced error handling
    let session: Stripe.Checkout.Session
    try {
      console.log("🔄 [Purchase Verify] Retrieving Stripe session...")
      session = await stripe.checkout.sessions.retrieve(sessionId, {
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
        decline_code: stripeError.decline_code,
        param: stripeError.param,
      })

      // Handle different types of Stripe errors more specifically
      if (stripeError.statusCode === 404) {
        return NextResponse.json(
          {
            error: "Payment session not found",
            details: "This session ID could not be found in your Stripe account.",
            sessionId: sessionId.substring(0, 20) + "...",
            possibleCauses: [
              "Session ID is incorrect or incomplete",
              "Session has expired (sessions expire after 24 hours)",
              "Session belongs to a different Stripe account",
              "Session was created with different API keys",
            ],
            stripeError: {
              type: stripeError.type,
              code: stripeError.code,
              message: stripeError.message,
            },
          },
          { status: 404 },
        )
      }

      if (stripeError.statusCode === 401) {
        return NextResponse.json(
          {
            error: "Stripe authentication failed",
            details: "The API key is invalid or doesn't have permission to access this resource.",
            stripeError: {
              type: stripeError.type,
              code: stripeError.code,
              message: stripeError.message,
            },
          },
          { status: 401 },
        )
      }

      if (stripeError.statusCode === 403) {
        return NextResponse.json(
          {
            error: "Stripe access forbidden",
            details: "The API key doesn't have permission to access this session.",
            stripeError: {
              type: stripeError.type,
              code: stripeError.code,
              message: stripeError.message,
            },
          },
          { status: 403 },
        )
      }

      // Generic Stripe error
      return NextResponse.json(
        {
          error: `Stripe API Error: ${stripeError.message}`,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          details: "There was an error communicating with Stripe.",
          stripeError: {
            type: stripeError.type,
            code: stripeError.code,
            message: stripeError.message,
            statusCode: stripeError.statusCode,
          },
        },
        { status: stripeError.statusCode || 500 },
      )
    }

    if (!session) {
      console.error("❌ [Purchase Verify] Session is null after successful retrieval")
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    console.log("📊 [Purchase Verify] Session details:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      mode: session.mode,
      amount_total: session.amount_total,
      currency: session.currency,
      customer: session.customer,
      metadata: session.metadata,
      created: session.created,
      expires_at: session.expires_at,
    })

    // Check if the session was paid
    if (session.payment_status !== "paid") {
      console.error("❌ [Purchase Verify] Payment not completed:", {
        payment_status: session.payment_status,
        status: session.status,
        mode: session.mode,
      })
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
          sessionStatus: session.status,
          mode: session.mode,
          details: `The payment for this session has status: ${session.payment_status}`,
          possibleReasons: [
            session.payment_status === "unpaid" ? "Payment was not completed" : null,
            session.payment_status === "no_payment_required" ? "No payment was required" : null,
            "Session may have expired",
            "Payment method was declined",
          ].filter(Boolean),
        },
        { status: 400 },
      )
    }

    // Extract product box ID from metadata
    const productBoxId = session.metadata?.productBoxId
    if (!productBoxId) {
      console.error("❌ [Purchase Verify] Product box ID not found in metadata:", {
        metadata: session.metadata,
        availableKeys: Object.keys(session.metadata || {}),
      })
      return NextResponse.json(
        {
          error: "Product box ID not found in session metadata",
          availableMetadata: Object.keys(session.metadata || {}),
          metadata: session.metadata,
          details: "The purchase session is missing required product information.",
        },
        { status: 400 },
      )
    }

    console.log("📦 [Purchase Verify] Product box ID found:", productBoxId)

    // Get buyer ID from metadata or use the verified user ID
    const buyerUid = session.metadata?.buyerUid || userId
    if (!buyerUid) {
      console.error("❌ [Purchase Verify] Buyer ID not found:", {
        metadataBuyerUid: session.metadata?.buyerUid,
        verifiedUserId: userId,
        hasIdToken: !!idToken,
      })
      return NextResponse.json(
        {
          error: "Buyer ID not found",
          details: "Unable to identify the purchaser for this transaction.",
          debugInfo: {
            hasIdToken: !!idToken,
            metadataBuyerUid: session.metadata?.buyerUid,
            verifiedUserId: userId,
          },
        },
        { status: 400 },
      )
    }

    console.log("👤 [Purchase Verify] Buyer UID found:", buyerUid)

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
        console.log("ℹ️ [Purchase Verify] Purchase already recorded, returning existing data")
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
      console.log("📦 [Purchase Verify] Product box found:", {
        title: productBoxData.title,
        creatorId: productBoxData.creatorId,
      })
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
        })

      console.log("✅ [Purchase Verify] Created purchase record:", purchaseRef.id)
    } catch (purchaseError) {
      console.error("❌ [Purchase Verify] Error creating purchase record:", purchaseError)
      return NextResponse.json(
        {
          error: "Failed to record purchase",
          details: "The purchase could not be saved to your account.",
          firestoreError: purchaseError instanceof Error ? purchaseError.message : "Unknown error",
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
      },
    }

    console.log("✅ [Purchase Verify] Verification completed successfully")
    return NextResponse.json(purchaseResponse)
  } catch (error) {
    console.error("❌ [Purchase Verify] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
      error,
    })

    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        errorType: error instanceof Error ? error.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
