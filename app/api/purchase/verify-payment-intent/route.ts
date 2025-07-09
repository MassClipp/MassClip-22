import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, connectedAccountId, userId } = await request.json()

    if (!paymentIntentId || !userId) {
      return NextResponse.json({ error: "Missing paymentIntentId or userId" }, { status: 400 })
    }

    console.log(`🔍 [Payment Verify] Verifying payment intent ${paymentIntentId} for user ${userId}`)

    // Check if we've already processed this payment intent
    const existingPurchase = await checkExistingPurchase(paymentIntentId)
    if (existingPurchase) {
      console.log(`✅ [Payment Verify] Purchase already exists for payment intent ${paymentIntentId}`)
      return NextResponse.json({
        success: true,
        purchase: existingPurchase,
        alreadyProcessed: true,
      })
    }

    // Retrieve the payment intent from Stripe
    let paymentIntent
    try {
      const retrieveOptions: any = {}
      if (connectedAccountId) {
        retrieveOptions.stripeAccount = connectedAccountId
        console.log(`🔍 [Payment Verify] Using connected account: ${connectedAccountId}`)
      }

      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, retrieveOptions)
    } catch (stripeError: any) {
      console.error(`❌ [Payment Verify] Stripe payment intent retrieval failed:`, stripeError)
      return NextResponse.json({ error: "Invalid payment intent ID or payment not found" }, { status: 404 })
    }

    console.log(`🔍 [Payment Verify] Payment intent retrieved:`, {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    })

    // Validate the payment intent
    if (paymentIntent.status !== "succeeded") {
      console.error(`❌ [Payment Verify] Payment not completed. Status: ${paymentIntent.status}`)
      return NextResponse.json({ error: `Payment not completed. Status: ${paymentIntent.status}` }, { status: 400 })
    }

    // Validate metadata
    const { vaultId, productBoxId, userId: metadataUserId } = paymentIntent.metadata || {}
    const actualProductId = vaultId || productBoxId

    if (!actualProductId || !metadataUserId) {
      console.error(`❌ [Payment Verify] Missing required metadata:`, paymentIntent.metadata)
      return NextResponse.json({ error: "Invalid payment metadata" }, { status: 400 })
    }

    // Verify the user ID matches
    if (metadataUserId !== userId) {
      console.error(`❌ [Payment Verify] User ID mismatch. Payment: ${metadataUserId}, Request: ${userId}`)
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 })
    }

    console.log(`✅ [Payment Verify] Payment intent validation passed for ${paymentIntentId}`)

    // Get product/vault details from Firestore
    const productDoc = await db.collection("productBoxes").doc(actualProductId).get()
    if (!productDoc.exists) {
      console.error(`❌ [Payment Verify] Product not found: ${actualProductId}`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    const productData = productDoc.data()!

    // Get creator details
    const creatorId = productData.creatorId
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Create unified purchase record
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      productBoxId: actualProductId,
      sessionId: paymentIntent.id, // Use payment intent ID as session ID
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      creatorId: creatorId || "",
    })

    // Create comprehensive purchase data
    const purchaseData = {
      userId: userId,
      buyerUid: userId,
      productBoxId: actualProductId,
      vaultId: actualProductId, // For backward compatibility
      itemId: actualProductId,
      paymentIntentId: paymentIntent.id,
      sessionId: paymentIntent.id, // Use payment intent as session for consistency
      connectedAccountId: connectedAccountId || null,
      amount: paymentIntent.amount / 100,
      amountReceived: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "product_box",
      itemTitle: productData.title || "Untitled Product",
      itemDescription: productData.description || "",
      thumbnailUrl: productData.thumbnailUrl || "",
      customPreviewThumbnail: productData.customPreviewThumbnail || "",
      creatorId: creatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${actualProductId}/content`,
      verificationMethod: "payment_intent_direct", // Mark as directly verified via payment intent
      verifiedAt: new Date(),
      paymentMetadata: paymentIntent.metadata,
      stripeCharges: paymentIntent.charges?.data || [],
    }

    // Write to multiple collections for redundancy and compatibility
    const batch = db.batch()

    // 1. Main purchases collection (with payment intent ID as document ID)
    const mainPurchaseRef = db.collection("purchases").doc(paymentIntent.id)
    batch.set(mainPurchaseRef, purchaseData)

    // 2. User's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc(paymentIntent.id)
    batch.set(userPurchaseRef, purchaseData)

    // 3. Unified purchases collection
    const unifiedPurchaseRef = db.collection("userPurchases").doc(userId).collection("purchases").doc(paymentIntent.id)
    batch.set(unifiedPurchaseRef, purchaseData)

    // 4. Legacy purchases collection for backward compatibility
    const legacyPurchaseRef = db.collection("purchases").doc()
    batch.set(legacyPurchaseRef, {
      ...purchaseData,
      legacyId: legacyPurchaseRef.id,
    })

    await batch.commit()

    // Update product box sales counter
    await db
      .collection("productBoxes")
      .doc(actualProductId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(paymentIntent.amount / 100),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator
    if (creatorId) {
      const platformFeeRate = 0.25 // 25% platform fee
      const netAmount = (paymentIntent.amount / 100) * (1 - platformFeeRate)
      const platformFee = (paymentIntent.amount / 100) * platformFeeRate

      await db
        .collection("users")
        .doc(creatorId)
        .collection("sales")
        .add({
          productBoxId: actualProductId,
          vaultId: actualProductId,
          buyerUid: userId,
          paymentIntentId: paymentIntent.id,
          connectedAccountId: connectedAccountId || null,
          amount: paymentIntent.amount / 100,
          platformFee: platformFee,
          netAmount: netAmount,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productData.title || "Untitled Product",
          buyerEmail: paymentIntent.receipt_email || "",
          verificationMethod: "payment_intent_direct",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(paymentIntent.amount / 100),
          lastSaleAt: new Date(),
        })
    }

    console.log(
      `✅ [Payment Verify] Successfully verified and recorded purchase for payment intent: ${paymentIntentId}`,
    )

    // Get the created purchase for response
    const createdPurchase = await UnifiedPurchaseService.getUserPurchase(userId, paymentIntent.id)

    return NextResponse.json({
      success: true,
      purchase: createdPurchase,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        amountReceived: paymentIntent.amount_received
          ? paymentIntent.amount_received / 100
          : paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
      productBox: {
        id: actualProductId,
        title: productData.title,
        description: productData.description,
        thumbnailUrl: productData.thumbnailUrl,
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
    console.error(`❌ [Payment Verify] Error verifying payment intent:`, error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}

async function checkExistingPurchase(paymentIntentId: string) {
  try {
    // Check main purchases collection first
    const mainPurchaseDoc = await db.collection("purchases").doc(paymentIntentId).get()
    if (mainPurchaseDoc.exists()) {
      return mainPurchaseDoc.data()
    }

    // Check if any purchase has this payment intent ID
    const purchasesQuery = await db
      .collection("purchases")
      .where("paymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get()
    if (!purchasesQuery.empty) {
      return purchasesQuery.docs[0].data()
    }

    return null
  } catch (error) {
    console.error("Error checking existing purchase:", error)
    return null
  }
}
