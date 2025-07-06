import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Purchase Verify API] Starting verification process")

    const { sessionId, idToken } = await request.json()

    // STEP 3: Log received session ID in backend
    console.log("📋 [Purchase Verify API] Received request:", {
      sessionId: sessionId,
      sessionIdLength: sessionId?.length,
      sessionIdPrefix: sessionId?.substring(0, 10),
      isTestSession: sessionId?.startsWith("cs_test_"),
      isLiveSession: sessionId?.startsWith("cs_live_"),
      hasIdToken: !!idToken,
      idTokenLength: idToken?.length,
    })

    if (!sessionId) {
      console.error("❌ [Purchase Verify API] Missing session ID")
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Verify user if token is provided
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Purchase Verify API] User authenticated:", {
          userId: userId,
          userEmail: decodedToken.email,
        })
      } catch (error) {
        console.error("❌ [Purchase Verify API] Error verifying ID token:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    // STEP 4: Initialize Stripe with your secret key and retrieve session
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    console.log("🔑 [Purchase Verify API] Stripe configuration:", {
      hasStripeKey: !!stripeSecretKey,
      keyPrefix: stripeSecretKey?.substring(0, 10),
      keyType: stripeSecretKey?.startsWith("sk_test_")
        ? "test"
        : stripeSecretKey?.startsWith("sk_live_")
          ? "live"
          : "unknown",
      sessionType: sessionId.startsWith("cs_test_") ? "test" : "live",
      keyMatchesSession:
        (sessionId.startsWith("cs_test_") && stripeSecretKey?.startsWith("sk_test_")) ||
        (sessionId.startsWith("cs_live_") && stripeSecretKey?.startsWith("sk_live_")),
    })

    if (!stripeSecretKey) {
      console.error("❌ [Purchase Verify API] Missing STRIPE_SECRET_KEY environment variable")
      return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 })
    }

    // Check for test/live mismatch
    const sessionIsTest = sessionId.startsWith("cs_test_")
    const keyIsTest = stripeSecretKey.startsWith("sk_test_")

    if (sessionIsTest !== keyIsTest) {
      console.error("❌ [Purchase Verify API] Test/Live mode mismatch:", {
        sessionType: sessionIsTest ? "test" : "live",
        keyType: keyIsTest ? "test" : "live",
        sessionId: sessionId.substring(0, 20) + "...",
        keyPrefix: stripeSecretKey.substring(0, 10) + "...",
      })
      return NextResponse.json(
        {
          error: "Configuration Error: Test/Live Mode Mismatch",
          details: `Session is ${sessionIsTest ? "test" : "live"} but Stripe key is ${keyIsTest ? "test" : "live"}`,
          sessionType: sessionIsTest ? "test" : "live",
          keyType: keyIsTest ? "test" : "live",
          recommendation:
            "Ensure your STRIPE_SECRET_KEY matches the session type (test sessions need test keys, live sessions need live keys)",
        },
        { status: 400 },
      )
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-08-16" })
    console.log("✅ [Purchase Verify API] Stripe client initialized with API version 2023-08-16")

    // Retrieve the Stripe session
    let session
    try {
      console.log("🔄 [Purchase Verify API] Retrieving Stripe session...")
      console.log("📡 [Purchase Verify API] Calling stripe.checkout.sessions.retrieve with:", {
        sessionId: sessionId,
        expand: ["payment_intent", "line_items"],
      })

      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items"],
      })

      console.log("✅ [Purchase Verify API] Stripe session retrieved successfully:", {
        sessionId: session.id,
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        amount_total: session.amount_total,
        currency: session.currency,
        created: new Date(session.created * 1000),
        expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
        customer_email: session.customer_details?.email,
        metadata: session.metadata,
        payment_intent: session.payment_intent
          ? {
              id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id,
              status: typeof session.payment_intent === "object" ? session.payment_intent.status : "unknown",
            }
          : null,
        line_items: session.line_items?.data?.map((item) => ({
          description: item.description,
          amount_total: item.amount_total,
          currency: item.currency,
          quantity: item.quantity,
        })),
      })
    } catch (stripeError: any) {
      console.error("❌ [Purchase Verify API] Stripe session retrieval failed:", {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
        sessionId: sessionId.substring(0, 20) + "...",
        stripeKeyType: keyIsTest ? "test" : "live",
      })

      if (stripeError.statusCode === 404) {
        return NextResponse.json(
          {
            error: "Payment session not found",
            details: "The session ID does not exist in your Stripe account",
            sessionId: sessionId.substring(0, 20) + "...",
            stripeKeyType: keyIsTest ? "test" : "live",
            stripeError: {
              type: stripeError.type,
              code: stripeError.code,
              message: stripeError.message,
            },
            recommendation: `Verify the session exists in your Stripe ${keyIsTest ? "test" : "live"} dashboard`,
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
          stripeKeyType: keyIsTest ? "test" : "live",
          recommendation: "Check your Stripe configuration and try again",
        },
        { status: 500 },
      )
    }

    if (!session) {
      console.error("❌ [Purchase Verify API] Session is null")
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if the session was paid
    if (session.payment_status !== "paid") {
      console.error("❌ [Purchase Verify API] Payment not completed:", {
        payment_status: session.payment_status,
        status: session.status,
        sessionId: session.id,
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
      console.error("❌ [Purchase Verify API] Product box ID not found in metadata:", {
        metadata: session.metadata,
        availableKeys: Object.keys(session.metadata || {}),
      })
      return NextResponse.json(
        {
          error: "Product box ID not found in session metadata",
          availableMetadata: Object.keys(session.metadata || {}),
          details: "The purchase session is missing required product information.",
        },
        { status: 400 },
      )
    }

    console.log("📦 [Purchase Verify API] Product box ID found:", productBoxId)

    // Get buyer ID from metadata or use the verified user ID
    const buyerUid = session.metadata?.buyerUid || userId
    if (!buyerUid) {
      console.error("❌ [Purchase Verify API] Buyer ID not found")
      return NextResponse.json(
        {
          error: "Buyer ID not found",
          details: "Unable to identify the purchaser for this transaction.",
        },
        { status: 400 },
      )
    }

    console.log("👤 [Purchase Verify API] Buyer UID:", buyerUid)

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
        console.log("ℹ️ [Purchase Verify API] Purchase already recorded, returning existing data")
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
            stripeMode: keyIsTest ? "test" : "live",
          },
        })
      }
    } catch (firestoreError) {
      console.error("❌ [Purchase Verify API] Error checking existing purchases:", firestoreError)
    }

    // Get product box details
    let productBoxDoc
    let productBoxData
    try {
      productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (!productBoxDoc.exists) {
        console.error("❌ [Purchase Verify API] Product box not found:", productBoxId)
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
      console.log("📦 [Purchase Verify API] Product box found:", {
        title: productBoxData.title,
        creatorId: productBoxData.creatorId,
        price: productBoxData.price,
      })
    } catch (productBoxError) {
      console.error("❌ [Purchase Verify API] Error fetching product box:", productBoxError)
      return NextResponse.json(
        {
          error: "Failed to fetch product box details",
          details: "There was an error retrieving the product information.",
        },
        { status: 500 },
      )
    }

    // Record the purchase
    let purchaseRef
    try {
      console.log("💾 [Purchase Verify API] Recording purchase in Firestore...")
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
          stripeMode: keyIsTest ? "test" : "live",
          sessionCreated: new Date(session.created * 1000),
          sessionExpires: session.expires_at ? new Date(session.expires_at * 1000) : null,
        })

      console.log("✅ [Purchase Verify API] Purchase recorded successfully:", {
        purchaseId: purchaseRef.id,
        collection: `users/${buyerUid}/purchases`,
      })
    } catch (purchaseError) {
      console.error("❌ [Purchase Verify API] Error creating purchase record:", purchaseError)
      return NextResponse.json(
        {
          error: "Failed to record purchase",
          details: "The purchase could not be saved to your account.",
        },
        { status: 500 },
      )
    }

    // Update product box sales statistics
    try {
      console.log("📊 [Purchase Verify API] Updating product box sales statistics...")
      await db
        .collection("productBoxes")
        .doc(productBoxId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        })
      console.log("✅ [Purchase Verify API] Product box sales updated")
    } catch (updateError) {
      console.error("⚠️ [Purchase Verify API] Error updating product box sales:", updateError)
    }

    // Record the sale for the creator
    const creatorId = productBoxData.creatorId || session.metadata?.creatorUid
    if (creatorId) {
      try {
        console.log("💰 [Purchase Verify API] Recording creator sale...")
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
            stripeMode: keyIsTest ? "test" : "live",
          })

        await db
          .collection("users")
          .doc(creatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
          })

        console.log("✅ [Purchase Verify API] Creator sale recorded")
      } catch (creatorError) {
        console.error("⚠️ [Purchase Verify API] Error recording creator sale:", creatorError)
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
        console.error("⚠️ [Purchase Verify API] Error fetching creator details:", creatorError)
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
        stripeMode: keyIsTest ? "test" : "live",
      },
    }

    console.log("✅ [Purchase Verify API] Verification completed successfully:", {
      purchaseId: purchaseRef.id,
      productBoxId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      stripeMode: keyIsTest ? "test" : "live",
    })

    return NextResponse.json(purchaseResponse)
  } catch (error) {
    console.error("❌ [Purchase Verify API] Unexpected error:", {
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
