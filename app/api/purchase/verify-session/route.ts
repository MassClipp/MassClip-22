import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, callStripeWithAccount } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, connectedAccountId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 })
    }

    console.log(
      `🔍 [Purchase Verify] Verifying session ${sessionId} for user ${userId} (${isTestMode ? "TEST" : "LIVE"} mode)`,
    )

    // Check if we've already processed this purchase
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(userId, sessionId)
    if (existingPurchase) {
      console.log(`✅ [Purchase Verify] Purchase already exists for session ${sessionId}`)
      return NextResponse.json({
        success: true,
        purchase: existingPurchase,
        alreadyProcessed: true,
      })
    }

    // Retrieve the session from Stripe
    let session
    try {
      if (connectedAccountId) {
        // Use connected account context to retrieve session
        console.log(`🔍 [Purchase Verify] Retrieving session with connected account: ${connectedAccountId}`)
        session = await callStripeWithAccount(connectedAccountId, async (stripeWithAccount) => {
          return await stripeWithAccount.checkout.sessions.retrieve(sessionId)
        })
      } else {
        // Fallback to platform account
        console.log(`🔍 [Purchase Verify] Retrieving session with platform account`)
        session = await stripe.checkout.sessions.retrieve(sessionId)
      }
    } catch (stripeError: any) {
      console.error(`❌ [Purchase Verify] Stripe session retrieval failed:`, stripeError)

      // If session not found with connected account, try platform account
      if (connectedAccountId && stripeError.code === "resource_missing") {
        console.log(`🔄 [Purchase Verify] Retrying with platform account`)
        try {
          session = await stripe.checkout.sessions.retrieve(sessionId)
        } catch (platformError: any) {
          console.error(`❌ [Purchase Verify] Platform session retrieval also failed:`, platformError)
          return NextResponse.json({ error: "Invalid session ID or session not found" }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: "Invalid session ID or session not found" }, { status: 404 })
      }
    }

    console.log(`🔍 [Purchase Verify] Session retrieved:`, {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      mode: session.mode,
      livemode: session.livemode,
      metadata: session.metadata,
    })

    // Validate the session mode matches our current mode
    const sessionIsTest = !session.livemode
    if (sessionIsTest !== isTestMode) {
      console.error(
        `❌ [Purchase Verify] Mode mismatch. Session: ${sessionIsTest ? "test" : "live"}, API: ${isTestMode ? "test" : "live"}`,
      )
      return NextResponse.json(
        {
          error: `Session mode mismatch. Expected ${isTestMode ? "test" : "live"} mode session.`,
        },
        { status: 400 },
      )
    }

    // Validate the session
    if (session.payment_status !== "paid") {
      console.error(`❌ [Purchase Verify] Payment not completed. Status: ${session.payment_status}`)
      return NextResponse.json({ error: `Payment not completed. Status: ${session.payment_status}` }, { status: 400 })
    }

    if (session.status !== "complete") {
      console.error(`❌ [Purchase Verify] Session not complete. Status: ${session.status}`)
      return NextResponse.json({ error: `Session not complete. Status: ${session.status}` }, { status: 400 })
    }

    // Validate metadata
    const { productBoxId, buyerUid, creatorUid, connectedAccountId: metadataAccountId } = session.metadata || {}
    if (!productBoxId || !buyerUid) {
      console.error(`❌ [Purchase Verify] Missing required metadata:`, session.metadata)
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    // Verify the user ID matches
    if (buyerUid !== userId) {
      console.error(`❌ [Purchase Verify] User ID mismatch. Session: ${buyerUid}, Request: ${userId}`)
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 })
    }

    console.log(`✅ [Purchase Verify] Session validation passed for ${sessionId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Purchase Verify] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    const productBoxData = productBoxDoc.data()!

    // Get creator details
    const creatorId = creatorUid || productBoxData.creatorId
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      productBoxId,
      sessionId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      creatorId: creatorId || "",
      connectedAccountId: metadataAccountId || connectedAccountId,
      mode: isTestMode ? "test" : "live",
    })

    // Also write to main purchases collection for API compatibility
    const mainPurchaseData = {
      userId: buyerUid,
      buyerUid,
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
      verificationMethod: "direct_api", // Mark as directly verified
      verifiedAt: new Date(),
      connectedAccountId: metadataAccountId || connectedAccountId,
      mode: isTestMode ? "test" : "live",
    }

    // Write to main purchases collection with document ID as sessionId
    await db.collection("purchases").doc(session.id).set(mainPurchaseData)

    // Also record in legacy purchases collection
    await db.collection("users").doc(buyerUid).collection("purchases").add(mainPurchaseData)
    await db.collection("purchases").add({
      ...mainPurchaseData,
      userId: buyerUid,
      buyerUid,
    })

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
      const applicationFee = session.amount_total ? (session.amount_total * 0.25) / 100 : 0
      const netAmount = session.amount_total ? (session.amount_total * 0.75) / 100 : 0

      await db
        .collection("users")
        .doc(creatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid,
          sessionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          platformFee: applicationFee,
          netAmount: netAmount,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          buyerEmail: session.customer_email || "",
          verificationMethod: "direct_api",
          connectedAccountId: metadataAccountId || connectedAccountId,
          mode: isTestMode ? "test" : "live",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(netAmount),
          lastSaleAt: new Date(),
        })
    }

    console.log(`✅ [Purchase Verify] Successfully verified and recorded purchase for session: ${sessionId}`)

    // Get the created purchase for response
    const createdPurchase = await UnifiedPurchaseService.getUserPurchase(userId, sessionId)

    return NextResponse.json({
      success: true,
      purchase: createdPurchase,
      session: {
        id: session.id,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        payment_status: session.payment_status,
        status: session.status,
        mode: isTestMode ? "test" : "live",
        livemode: session.livemode,
      },
      productBox: {
        id: productBoxId,
        title: productBoxData.title,
        description: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl,
      },
      creator: creatorData
        ? {
            id: creatorId,
            name: creatorData.displayName || creatorData.name,
            username: creatorData.username,
            connectedAccountId: metadataAccountId || connectedAccountId,
          }
        : null,
    })
  } catch (error: any) {
    console.error(`❌ [Purchase Verify] Error verifying purchase:`, error)
    return NextResponse.json({ error: "Purchase verification failed" }, { status: 500 })
  }
}
