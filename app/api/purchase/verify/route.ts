import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  let rawBody = ""

  try {
    console.log("🔍 [Purchase Verify] Starting verification process")
    console.log("🔍 [Purchase Verify] Request headers:", Object.fromEntries(request.headers.entries()))

    // Step 1: Parse and validate request body
    let requestData: any
    try {
      rawBody = await request.text()
      console.log("📋 [Purchase Verify] Raw request body:", rawBody)
      requestData = JSON.parse(rawBody)
    } catch (parseError) {
      console.error("❌ [Purchase Verify] JSON parsing failed:", {
        error: parseError instanceof Error ? parseError.message : "Unknown parse error",
        rawBody: rawBody.substring(0, 500) + (rawBody.length > 500 ? "..." : ""),
        contentType: request.headers.get("content-type"),
      })
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: parseError instanceof Error ? parseError.message : "Failed to parse JSON",
          rawBody: rawBody.substring(0, 200),
          expectedContentType: "application/json",
          receivedContentType: request.headers.get("content-type"),
        },
        { status: 400 },
      )
    }

    const { sessionId, idToken } = requestData

    // Step 2: Validate required inputs
    if (!sessionId) {
      console.error("❌ [Purchase Verify] Missing session ID:", {
        requestData,
        hasSessionId: !!sessionId,
        sessionIdType: typeof sessionId,
        requestKeys: Object.keys(requestData || {}),
      })
      return NextResponse.json(
        {
          error: "Missing session ID",
          details: "sessionId is required in request body",
          receivedData: Object.keys(requestData || {}),
          expectedFields: ["sessionId", "idToken (optional)"],
        },
        { status: 400 },
      )
    }

    console.log("📋 [Purchase Verify] Session ID received:", sessionId.substring(0, 20) + "...")

    // Step 3: Environment Mode Check - Get actual Stripe key being used
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const isProduction = vercelEnv === "production"

    let actualStripeKey: string | undefined
    if (isProduction) {
      actualStripeKey = process.env.STRIPE_SECRET_KEY
    } else {
      actualStripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    }

    const isTestKey = actualStripeKey?.startsWith("sk_test_")
    const isLiveKey = actualStripeKey?.startsWith("sk_live_")
    const isTestSession = sessionId.startsWith("cs_test_")
    const isLiveSession = sessionId.startsWith("cs_live_")

    console.log("🔧 [Purchase Verify] Environment and key analysis:", {
      vercelEnv,
      isProduction,
      stripeKeyExists: !!actualStripeKey,
      stripeKeyLength: actualStripeKey?.length || 0,
      keyType: isTestKey ? "test" : isLiveKey ? "live" : "unknown",
      keyPrefix: actualStripeKey?.substring(0, 8) || "none",
      sessionType: isTestSession ? "test" : isLiveSession ? "live" : "unknown",
      sessionPrefix: sessionId.substring(0, 8),
      hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
      hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
      expectedMatch: (isTestKey && isTestSession) || (isLiveKey && isLiveSession),
    })

    // Check for test/live mismatch
    const hasMismatch = (isTestKey && isLiveSession) || (isLiveKey && isTestSession)

    if (hasMismatch) {
      console.error("❌ [Purchase Verify] CONFIRMED Test/Live mode mismatch:", {
        actualKeyType: isTestKey ? "test" : "live",
        sessionType: isTestSession ? "test" : "live",
        keyPrefix: actualStripeKey?.substring(0, 8),
        sessionPrefix: sessionId.substring(0, 8),
        environment: vercelEnv,
        recommendation: isTestKey
          ? "Use a test session (cs_test_...) or switch to live key"
          : "Use a live session (cs_live_...) or switch to test key",
      })
      return NextResponse.json(
        {
          error: "Configuration Error: Test/Live Mode Mismatch",
          details: isTestKey
            ? "You're using a test Stripe key but trying to access a live session."
            : "You're using a live Stripe key but trying to access a test session.",
          actualKeyType: isTestKey ? "test" : "live",
          sessionType: isTestSession ? "test" : "live",
          environment: vercelEnv,
          keyPrefix: actualStripeKey?.substring(0, 8),
          sessionPrefix: sessionId.substring(0, 8),
          recommendation: isTestKey
            ? "Either use a live Stripe key or use a test session ID (cs_test_...)"
            : "Either use a test Stripe key or use a live session ID (cs_live_...)",
        },
        { status: 400 },
      )
    }

    console.log("✅ [Purchase Verify] Mode check passed - no mismatch detected")

    // Step 4: Verify user authentication if token provided
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Purchase Verify] User authenticated:", userId)
      } catch (authError) {
        console.error("❌ [Purchase Verify] Error verifying ID token:", {
          error: authError instanceof Error ? authError.message : "Unknown auth error",
          tokenLength: idToken?.length || 0,
          tokenPrefix: idToken?.substring(0, 20) || "none",
        })
        return NextResponse.json(
          {
            error: "Invalid authentication token",
            details: authError instanceof Error ? authError.message : "Token verification failed",
          },
          { status: 401 },
        )
      }
    } else {
      console.log("ℹ️ [Purchase Verify] No ID token provided, proceeding without user verification")
    }

    // Step 5: Retrieve Stripe session with comprehensive error handling
    let session: Stripe.Checkout.Session
    try {
      console.log("🔄 [Purchase Verify] Retrieving Stripe session with expand options...")
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "line_items", "customer"],
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
        sessionId: sessionId.substring(0, 20) + "...",
        keyType: isTestKey ? "test" : "live",
      })

      // Handle specific Stripe error types
      if (stripeError.statusCode === 404) {
        return NextResponse.json(
          {
            error: "Payment session not found",
            details: "This session ID could not be found in your Stripe account.",
            sessionId: sessionId.substring(0, 20) + "...",
            keyType: isTestKey ? "test" : "live",
            possibleCauses: [
              "Session ID is incorrect or incomplete",
              "Session has expired (sessions expire after 24 hours)",
              "Session belongs to a different Stripe account",
              "Session was created with different API keys (test vs live)",
              "Session was created in a different environment",
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
            keyType: isTestKey ? "test" : "live",
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
            keyType: isTestKey ? "test" : "live",
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
          keyType: isTestKey ? "test" : "live",
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

    // Step 6: Log comprehensive session details
    console.log("📊 [Purchase Verify] Complete session analysis:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      mode: session.mode,
      amount_total: session.amount_total,
      currency: session.currency,
      customer: session.customer,
      customer_email: session.customer_details?.email,
      payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      created: new Date(session.created * 1000).toISOString(),
      expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      metadata: session.metadata,
      metadataKeys: Object.keys(session.metadata || {}),
      line_items: session.line_items?.data?.length || 0,
    })

    // Step 7: Validate payment completion
    if (session.payment_status !== "paid") {
      console.error("❌ [Purchase Verify] Payment not completed:", {
        payment_status: session.payment_status,
        status: session.status,
        mode: session.mode,
        amount_total: session.amount_total,
        expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        isExpired: session.expires_at ? Date.now() > session.expires_at * 1000 : false,
      })
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
          sessionStatus: session.status,
          mode: session.mode,
          details: `The payment for this session has status: ${session.payment_status}`,
          isExpired: session.expires_at ? Date.now() > session.expires_at * 1000 : false,
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          possibleReasons: [
            session.payment_status === "unpaid" ? "Payment was not completed" : null,
            session.payment_status === "no_payment_required" ? "No payment was required" : null,
            session.expires_at && Date.now() > session.expires_at * 1000 ? "Session has expired" : null,
            "Payment method was declined",
            "Customer abandoned checkout",
          ].filter(Boolean),
        },
        { status: 400 },
      )
    }

    // Step 8: Extract and validate metadata
    const productBoxId = session.metadata?.productBoxId
    const buyerUid = session.metadata?.buyerUid || userId
    const creatorUid = session.metadata?.creatorUid

    console.log("🔍 [Purchase Verify] Metadata extraction:", {
      productBoxId,
      buyerUid,
      creatorUid,
      allMetadata: session.metadata,
      metadataKeys: Object.keys(session.metadata || {}),
      hasIdToken: !!idToken,
      verifiedUserId: userId,
    })

    if (!productBoxId) {
      console.error("❌ [Purchase Verify] Product box ID not found in metadata:", {
        metadata: session.metadata,
        availableKeys: Object.keys(session.metadata || {}),
        sessionId: session.id,
        lineItems:
          session.line_items?.data?.map((item) => ({
            price: item.price?.id,
            product: typeof item.price?.product === "string" ? item.price.product : item.price?.product?.id,
            quantity: item.quantity,
          })) || [],
      })
      return NextResponse.json(
        {
          error: "Product box ID not found in session metadata",
          availableMetadata: Object.keys(session.metadata || {}),
          metadata: session.metadata,
          details: "The purchase session is missing required product information.",
          sessionId: session.id,
          troubleshooting: [
            "Check if productBoxId was included when creating the checkout session",
            "Verify metadata is being passed correctly in the frontend",
            "Ensure the session was created with the correct parameters",
          ],
        },
        { status: 400 },
      )
    }

    if (!buyerUid) {
      console.error("❌ [Purchase Verify] Buyer ID not found:", {
        metadataBuyerUid: session.metadata?.buyerUid,
        verifiedUserId: userId,
        hasIdToken: !!idToken,
        customerEmail: session.customer_details?.email,
        customer: session.customer,
      })
      return NextResponse.json(
        {
          error: "Buyer ID not found",
          details: "Unable to identify the purchaser for this transaction.",
          debugInfo: {
            hasIdToken: !!idToken,
            metadataBuyerUid: session.metadata?.buyerUid,
            verifiedUserId: userId,
            customerEmail: session.customer_details?.email,
          },
          troubleshooting: [
            "Ensure buyerUid is included in session metadata",
            "Provide idToken in the request for user verification",
            "Check if user is properly authenticated",
          ],
        },
        { status: 400 },
      )
    }

    console.log("✅ [Purchase Verify] All required IDs found:", {
      productBoxId,
      buyerUid,
      creatorUid,
    })

    // Step 9: Check for existing purchase
    try {
      console.log("🔍 [Purchase Verify] Checking for existing purchase...")
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

        // Get product box details for response
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
        const productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

        // Get creator details
        const creatorId = productBoxData?.creatorId || creatorUid
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
      console.error("❌ [Purchase Verify] Error checking existing purchases:", {
        error: firestoreError instanceof Error ? firestoreError.message : "Unknown Firestore error",
        buyerUid,
        sessionId,
      })
      // Continue with creating new purchase record
    }

    // Step 10: Validate product box exists
    let productBoxDoc
    let productBoxData
    try {
      console.log("🔍 [Purchase Verify] Fetching product box details...")
      productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (!productBoxDoc.exists) {
        console.error("❌ [Purchase Verify] Product box not found:", {
          productBoxId,
          sessionId,
          metadata: session.metadata,
        })
        return NextResponse.json(
          {
            error: "Product box not found",
            productBoxId,
            details: "The purchased product could not be found in our database.",
            sessionId,
            troubleshooting: [
              "Verify the productBoxId in the session metadata is correct",
              "Check if the product box was deleted after checkout creation",
              "Ensure the product box exists in the correct Firestore collection",
            ],
          },
          { status: 404 },
        )
      }
      productBoxData = productBoxDoc.data()!
      console.log("✅ [Purchase Verify] Product box found:", {
        title: productBoxData.title,
        creatorId: productBoxData.creatorId,
        price: productBoxData.price,
        totalSales: productBoxData.totalSales || 0,
      })
    } catch (productBoxError) {
      console.error("❌ [Purchase Verify] Error fetching product box:", {
        error: productBoxError instanceof Error ? productBoxError.message : "Unknown error",
        productBoxId,
      })
      return NextResponse.json(
        {
          error: "Failed to fetch product box details",
          details: "There was an error retrieving the product information.",
          productBoxId,
          firestoreError: productBoxError instanceof Error ? productBoxError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Step 11: Create purchase record
    let purchaseRef
    try {
      console.log("💾 [Purchase Verify] Creating purchase record...")
      const purchaseData = {
        productBoxId,
        sessionId,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        timestamp: db.FieldValue.serverTimestamp(),
        status: "completed",
        creatorId: productBoxData.creatorId,
        customerEmail: session.customer_details?.email || null,
      }

      purchaseRef = await db.collection("users").doc(buyerUid).collection("purchases").add(purchaseData)

      console.log("✅ [Purchase Verify] Created purchase record:", {
        purchaseId: purchaseRef.id,
        buyerUid,
        productBoxId,
        amount: purchaseData.amount,
      })
    } catch (purchaseError) {
      console.error("❌ [Purchase Verify] Error creating purchase record:", {
        error: purchaseError instanceof Error ? purchaseError.message : "Unknown error",
        buyerUid,
        productBoxId,
        sessionId,
      })
      return NextResponse.json(
        {
          error: "Failed to record purchase",
          details: "The purchase could not be saved to your account.",
          firestoreError: purchaseError instanceof Error ? purchaseError.message : "Unknown error",
          buyerUid,
          productBoxId,
        },
        { status: 500 },
      )
    }

    // Step 12: Update product box sales counters
    try {
      console.log("📈 [Purchase Verify] Updating product box sales counters...")
      const saleAmount = session.amount_total ? session.amount_total / 100 : 0
      await db
        .collection("productBoxes")
        .doc(productBoxId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(saleAmount),
          lastSaleAt: db.FieldValue.serverTimestamp(),
        })
      console.log("✅ [Purchase Verify] Updated product box sales:", {
        productBoxId,
        incrementedSales: 1,
        incrementedRevenue: saleAmount,
      })
    } catch (updateError) {
      console.error("⚠️ [Purchase Verify] Error updating product box sales:", {
        error: updateError instanceof Error ? updateError.message : "Unknown error",
        productBoxId,
      })
      // Don't fail the entire process for this
    }

    // Step 13: Record creator sale
    const creatorId = productBoxData.creatorId || creatorUid
    if (creatorId) {
      try {
        console.log("💰 [Purchase Verify] Recording creator sale...")
        const saleAmount = session.amount_total ? session.amount_total / 100 : 0
        const platformFee = saleAmount * 0.05 // 5% platform fee
        const netAmount = saleAmount - platformFee

        const saleData = {
          productBoxId,
          buyerUid,
          sessionId,
          amount: saleAmount,
          platformFee,
          netAmount,
          purchasedAt: db.FieldValue.serverTimestamp(),
          status: "completed",
          customerEmail: session.customer_details?.email || null,
        }

        await db.collection("users").doc(creatorId).collection("sales").add(saleData)

        // Update creator's total sales
        await db
          .collection("users")
          .doc(creatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(saleAmount),
            totalNetRevenue: db.FieldValue.increment(netAmount),
            lastSaleAt: db.FieldValue.serverTimestamp(),
          })

        console.log("✅ [Purchase Verify] Recorded creator sale:", {
          creatorId,
          saleAmount,
          platformFee,
          netAmount,
        })
      } catch (creatorError) {
        console.error("⚠️ [Purchase Verify] Error recording creator sale:", {
          error: creatorError instanceof Error ? creatorError.message : "Unknown error",
          creatorId,
        })
        // Don't fail the entire process for this
      }
    } else {
      console.warn("⚠️ [Purchase Verify] No creator ID found, skipping creator sale record")
    }

    // Step 14: Get creator details for response
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
        console.error("⚠️ [Purchase Verify] Error fetching creator details:", {
          error: creatorError instanceof Error ? creatorError.message : "Unknown error",
          creatorId,
        })
      }
    }

    // Step 15: Build and return success response
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
        customerEmail: session.customer_details?.email,
      },
    }

    console.log("✅ [Purchase Verify] Verification completed successfully:", {
      purchaseId: purchaseRef.id,
      productBoxTitle: productBoxData.title,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      buyerUid,
      creatorId,
    })

    return NextResponse.json(purchaseResponse)
  } catch (error) {
    console.error("❌ [Purchase Verify] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
      rawBody: rawBody.substring(0, 500),
      error,
    })

    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        errorType: error instanceof Error ? error.name : "Unknown",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
