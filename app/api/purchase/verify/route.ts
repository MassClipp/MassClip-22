import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  let rawBody = ""

  try {
    console.log("🔍 [Purchase Verify] Starting verification process")

    // Parse request body with error handling
    try {
      rawBody = await request.text()
      console.log("📋 [Purchase Verify] Raw body length:", rawBody.length)
    } catch (parseError) {
      console.error("❌ [Purchase Verify] Failed to read request body:", parseError)
      return NextResponse.json(
        {
          error: "Failed to read request body",
          details: parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 400 },
      )
    }

    let requestData: any
    try {
      requestData = JSON.parse(rawBody)
    } catch (jsonError) {
      console.error("❌ [Purchase Verify] Failed to parse JSON:", jsonError)
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: jsonError instanceof Error ? jsonError.message : "Unknown error",
        },
        { status: 400 },
      )
    }

    const { sessionId, idToken } = requestData

    if (!sessionId) {
      console.error("❌ [Purchase Verify] Missing session ID")
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log("📋 [Purchase Verify] Session ID:", sessionId.substring(0, 20) + "...")

    // Import Stripe dynamically to catch initialization errors
    let stripe: Stripe
    let getKeyType: () => "test" | "live"
    let isTestMode: () => boolean

    try {
      const stripeModule = await import("@/lib/stripe")
      stripe = stripeModule.stripe
      getKeyType = stripeModule.getKeyType
      isTestMode = stripeModule.isTestMode
      console.log("✅ [Purchase Verify] Stripe module imported successfully")
    } catch (stripeImportError) {
      console.error("❌ [Purchase Verify] Failed to import Stripe:", stripeImportError)
      return NextResponse.json(
        {
          error: "Stripe configuration error",
          details: stripeImportError instanceof Error ? stripeImportError.message : "Failed to initialize Stripe",
        },
        { status: 500 },
      )
    }

    // Enhanced mode checking using actual Stripe instance
    let actualKeyType: "test" | "live"
    try {
      actualKeyType = getKeyType()
    } catch (keyTypeError) {
      console.error("❌ [Purchase Verify] Failed to get key type:", keyTypeError)
      return NextResponse.json(
        {
          error: "Stripe key type detection failed",
          details: keyTypeError instanceof Error ? keyTypeError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    const isTestSession = sessionId.startsWith("cs_test_")
    const isLiveSession = sessionId.startsWith("cs_live_")

    console.log("🔧 [Purchase Verify] Environment and key analysis:", {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      actualKeyType,
      isTestMode: isTestMode(),
      sessionType: isTestSession ? "test" : isLiveSession ? "live" : "unknown",
      sessionPrefix: sessionId.substring(0, 8),
      keyMatchesSession: (actualKeyType === "test" && isTestSession) || (actualKeyType === "live" && isLiveSession),
    })

    // Check for test/live mismatch using actual key in use
    const hasMismatch = (actualKeyType === "test" && isLiveSession) || (actualKeyType === "live" && isTestSession)

    if (hasMismatch) {
      console.error("❌ [Purchase Verify] CONFIRMED Test/Live mode mismatch:", {
        actualKeyType,
        sessionType: isTestSession ? "test" : "live",
        sessionPrefix: sessionId.substring(0, 8),
      })
      return NextResponse.json(
        {
          error: "Configuration Error: Test/Live Mode Mismatch",
          details:
            actualKeyType === "test"
              ? "You're using a test Stripe key but trying to access a live session."
              : "You're using a live Stripe key but trying to access a test session.",
          actualKeyType,
          sessionType: isTestSession ? "test" : "live",
          recommendation:
            actualKeyType === "test"
              ? "Either use a live Stripe key or use a test session ID (cs_test_...)"
              : "Either use a test Stripe key or use a live session ID (cs_live_...)",
        },
        { status: 400 },
      )
    }

    console.log("✅ [Purchase Verify] Mode check passed - key matches session type")

    // Verify user if token is provided
    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Purchase Verify] User authenticated:", userId)
      } catch (authError) {
        console.error("❌ [Purchase Verify] Error verifying ID token:", authError)
        return NextResponse.json(
          {
            error: "Invalid authentication token",
            details: authError instanceof Error ? authError.message : "Token verification failed",
          },
          { status: 401 },
        )
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
        actualKeyType,
        sessionPrefix: sessionId.substring(0, 8),
      })

      // Handle different types of Stripe errors more specifically
      if (stripeError.statusCode === 404 || stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Payment session not found",
            details: "This session ID could not be found in your Stripe account.",
            sessionId: sessionId.substring(0, 20) + "...",
            actualKeyType,
            sessionType: isTestSession ? "test" : "live",
            possibleCauses: [
              "Session ID is incorrect or incomplete",
              "Session has expired (sessions expire after 24 hours)",
              "Session belongs to a different Stripe account",
              `Session was created with ${isTestSession ? "test" : "live"} keys but you're using ${actualKeyType} keys`,
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
            actualKeyType,
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
            actualKeyType,
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
          actualKeyType,
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
          firestoreError: productBoxError instanceof Error ? productBoxError.message : "Unknown error",
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
          paymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || "usd",
          timestamp: db.FieldValue.serverTimestamp(),
          status: "completed",
          creatorId: productBoxData.creatorId,
          customerEmail: session.customer_details?.email || null,
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
          lastSaleAt: db.FieldValue.serverTimestamp(),
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
        const saleAmount = session.amount_total ? session.amount_total / 100 : 0
        const platformFee = saleAmount * 0.05 // 5% platform fee
        const netAmount = saleAmount - platformFee

        await db
          .collection("users")
          .doc(creatorId)
          .collection("sales")
          .add({
            productBoxId,
            buyerUid,
            sessionId,
            amount: saleAmount,
            platformFee,
            netAmount,
            purchasedAt: db.FieldValue.serverTimestamp(),
            status: "completed",
            customerEmail: session.customer_details?.email || null,
          })

        // Increment the creator's total sales
        await db
          .collection("users")
          .doc(creatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(saleAmount),
            totalNetRevenue: db.FieldValue.increment(netAmount),
            lastSaleAt: db.FieldValue.serverTimestamp(),
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
        customerEmail: session.customer_details?.email,
      },
    }

    console.log("✅ [Purchase Verify] Verification completed successfully")
    return NextResponse.json(purchaseResponse)
  } catch (error) {
    console.error("❌ [Purchase Verify] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
      rawBodyLength: rawBody.length,
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
