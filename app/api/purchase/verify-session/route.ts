import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 })
    }

    console.log(`🔍 [Purchase Verify] Verifying session ${sessionId} for user ${userId}`)

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
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch (stripeError: any) {
      console.error(`❌ [Purchase Verify] Stripe session retrieval failed:`, stripeError)
      return NextResponse.json({ error: "Invalid session ID or session not found" }, { status: 404 })
    }

    console.log(`🔍 [Purchase Verify] Session retrieved:`, {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      metadata: session.metadata,
    })

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
    const { productBoxId, buyerUid, creatorUid } = session.metadata || {}
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
      await db
        .collection("users")
        .doc(creatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid,
          sessionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          platformFee: session.amount_total ? (session.amount_total * 0.25) / 100 : 0,
          netAmount: session.amount_total ? (session.amount_total * 0.75) / 100 : 0,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          buyerEmail: session.customer_email || "",
          verificationMethod: "direct_api",
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
          }
        : null,
    })
  } catch (error: any) {
    console.error(`❌ [Purchase Verify] Error verifying purchase:`, error)
    return NextResponse.json({ error: "Purchase verification failed" }, { status: 500 })
  }
}
