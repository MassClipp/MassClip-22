import { type NextRequest, NextResponse } from "next/server"
import { stripe, isLiveMode } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, idToken } = await request.json()

    if (!sessionId || !idToken) {
      return NextResponse.json({ error: "Session ID and ID token are required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Verify Session] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Verify Session] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    console.log(
      `🔍 [Verify Session] Verifying session ${sessionId} for user ${userId} in ${isLiveMode ? "LIVE" : "TEST"} mode`,
    )

    // Check if purchase already exists
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(userId, sessionId)
    if (existingPurchase) {
      console.log("✅ [Verify Session] Purchase already exists:", sessionId)
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: existingPurchase,
        environment: process.env.NODE_ENV,
        stripeMode: isLiveMode ? "live" : "test",
      })
    }

    // Retrieve session from Stripe
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "customer"],
      })
      console.log(`✅ [Verify Session] Session retrieved from Stripe:`, {
        id: session.id,
        status: session.payment_status,
        amount: session.amount_total,
        mode: session.livemode ? "live" : "test",
      })
    } catch (stripeError: any) {
      console.error("❌ [Verify Session] Failed to retrieve session from Stripe:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to verify session with Stripe",
          details: stripeError.message,
          environment: process.env.NODE_ENV,
          stripeMode: isLiveMode ? "live" : "test",
        },
        { status: 400 },
      )
    }

    // Verify session mode matches our environment
    const sessionIsLive = session.livemode
    if (isLiveMode && !sessionIsLive) {
      console.error("❌ [Verify Session] Environment mismatch: Live environment but test session")
      return NextResponse.json(
        {
          error: "Session mode mismatch: Live environment requires live session",
          environment: process.env.NODE_ENV,
          stripeMode: isLiveMode ? "live" : "test",
          sessionMode: sessionIsLive ? "live" : "test",
        },
        { status: 400 },
      )
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      console.log(`⚠️ [Verify Session] Session payment not completed:`, {
        sessionId,
        paymentStatus: session.payment_status,
        mode: sessionIsLive ? "live" : "test",
      })
      return NextResponse.json({
        success: false,
        error: "Payment not completed",
        paymentStatus: session.payment_status,
        environment: process.env.NODE_ENV,
        stripeMode: isLiveMode ? "live" : "test",
      })
    }

    // Extract metadata
    const { productBoxId, creatorUid } = session.metadata || {}

    if (!productBoxId) {
      console.error("❌ [Verify Session] Missing product box ID in session metadata")
      return NextResponse.json(
        {
          error: "Invalid session: missing product information",
          environment: process.env.NODE_ENV,
          stripeMode: isLiveMode ? "live" : "test",
        },
        { status: 400 },
      )
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Verify Session] Product box not found:", productBoxId)
      return NextResponse.json(
        {
          error: "Product not found",
          environment: process.env.NODE_ENV,
          stripeMode: isLiveMode ? "live" : "test",
        },
        { status: 404 },
      )
    }

    const productBoxData = productBoxDoc.data()!

    // Get creator details
    const creatorId = creatorUid || productBoxData.creatorId
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    console.log(`✅ [Verify Session] Processing purchase:`, {
      sessionId,
      productBoxId,
      userId,
      creatorId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      environment: process.env.NODE_ENV,
      stripeMode: isLiveMode ? "live" : "test",
    })

    // Create unified purchase record
    const unifiedPurchase = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      productBoxId,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: creatorId || "",
    })

    // Create main purchase record
    const mainPurchaseData = {
      userId,
      buyerUid: userId,
      productBoxId,
      itemId: productBoxId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "product_box",
      itemTitle: productBoxData.title || "Untitled Product Box",
      itemDescription: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      customPreviewThumbnail: productBoxData.customPreviewThumbnail || "",
      creatorId: creatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${productBoxId}/content`,
      verificationMethod: "direct_verification",
      environment: process.env.NODE_ENV,
      stripeMode: isLiveMode ? "live" : "test",
      sessionMode: sessionIsLive ? "live" : "test",
      verifiedAt: new Date(),
    }

    // Write to purchases collection
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

    // Update product box sales counter
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator
    if (creatorId) {
      await db
        .collection("users")
        .doc(creatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid: userId,
          sessionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          buyerEmail: session.customer_details?.email || "",
          verificationMethod: "direct_verification",
          environment: process.env.NODE_ENV,
          stripeMode: isLiveMode ? "live" : "test",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(session.amount_total ? session.amount_total / 100 : 0),
          lastSaleAt: new Date(),
        })
    }

    console.log(`✅ [Verify Session] Purchase verification completed successfully for session: ${sessionId}`)

    return NextResponse.json({
      success: true,
      purchase: {
        id: session.id,
        productBoxId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        status: "completed",
        accessUrl: `/product-box/${productBoxId}/content`,
        environment: process.env.NODE_ENV,
        stripeMode: isLiveMode ? "live" : "test",
        sessionMode: sessionIsLive ? "live" : "test",
      },
      unifiedPurchase,
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
        environment: process.env.NODE_ENV,
        stripeMode: isLiveMode ? "live" : "test",
      },
      { status: 500 },
    )
  }
}
