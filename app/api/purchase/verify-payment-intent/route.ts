import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, connectedAccountId, userId } = await request.json()

    console.log(`🔍 [Payment Verify] Starting verification for payment intent: ${paymentIntentId}`)
    console.log(`🔍 [Payment Verify] User ID: ${userId}`)
    console.log(`🔍 [Payment Verify] Connected Account: ${connectedAccountId || "None"}`)

    // Validate required parameters
    if (!paymentIntentId || !userId) {
      console.error(`❌ [Payment Verify] Missing required parameters`)
      return NextResponse.json({ error: "Missing paymentIntentId or userId" }, { status: 400 })
    }

    // Check if we've already processed this payment intent to prevent duplicates
    const existingPurchase = await checkExistingPurchase(paymentIntentId)
    if (existingPurchase) {
      console.log(`✅ [Payment Verify] Purchase already exists for payment intent ${paymentIntentId}`)
      return NextResponse.json({
        success: true,
        purchase: existingPurchase,
        alreadyProcessed: true,
      })
    }

    // Retrieve the payment intent from Stripe with connected account support
    let paymentIntent
    try {
      const retrieveOptions: any = {}
      if (connectedAccountId) {
        retrieveOptions.stripeAccount = connectedAccountId
        console.log(`🔍 [Payment Verify] Using connected account: ${connectedAccountId}`)
      }

      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, retrieveOptions)
      console.log(`✅ [Payment Verify] Payment intent retrieved successfully`)
    } catch (stripeError: any) {
      console.error(`❌ [Payment Verify] Stripe payment intent retrieval failed:`, stripeError.message)
      return NextResponse.json(
        {
          error: "Invalid payment intent ID or payment not found",
          details: stripeError.message,
        },
        { status: 404 },
      )
    }

    console.log(`🔍 [Payment Verify] Payment intent details:`, {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    })

    // Critical validation: Ensure payment was successful
    if (paymentIntent.status !== "succeeded") {
      console.error(`❌ [Payment Verify] Payment not completed. Status: ${paymentIntent.status}`)
      return NextResponse.json(
        {
          error: `Payment not completed. Status: ${paymentIntent.status}`,
          paymentStatus: paymentIntent.status,
        },
        { status: 400 },
      )
    }

    // Extract and validate metadata
    const { vaultId, productBoxId, userId: metadataUserId } = paymentIntent.metadata || {}
    const actualProductId = vaultId || productBoxId

    if (!actualProductId || !metadataUserId) {
      console.error(`❌ [Payment Verify] Missing required metadata:`, paymentIntent.metadata)
      return NextResponse.json(
        {
          error: "Invalid payment metadata - missing product or user information",
          metadata: paymentIntent.metadata,
        },
        { status: 400 },
      )
    }

    // Security check: Verify the user ID matches the payment metadata
    if (metadataUserId !== userId) {
      console.error(`❌ [Payment Verify] User ID mismatch. Payment: ${metadataUserId}, Request: ${userId}`)
      return NextResponse.json(
        {
          error: "User ID mismatch - unauthorized access attempt",
          expected: metadataUserId,
          provided: userId,
        },
        { status: 403 },
      )
    }

    console.log(`✅ [Payment Verify] Payment intent validation passed for ${paymentIntentId}`)

    // Retrieve product/vault details from Firestore
    const productDoc = await db.collection("productBoxes").doc(actualProductId).get()
    if (!productDoc.exists) {
      console.error(`❌ [Payment Verify] Product not found: ${actualProductId}`)
      return NextResponse.json(
        {
          error: "Product not found in database",
          productId: actualProductId,
        },
        { status: 404 },
      )
    }
    const productData = productDoc.data()!

    console.log(`✅ [Payment Verify] Product retrieved: ${productData.title}`)

    // Get creator details for comprehensive logging
    const creatorId = productData.creatorId
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
      console.log(`✅ [Payment Verify] Creator data retrieved: ${creatorData?.displayName || "Unknown"}`)
    }

    // Create unified purchase record
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      productBoxId: actualProductId,
      sessionId: paymentIntent.id, // Use payment intent ID as session ID
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      creatorId: creatorId || "",
    })

    console.log(`✅ [Payment Verify] Unified purchase created: ${purchaseId}`)

    // Create comprehensive purchase data with enhanced logging
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
      // Enhanced logging fields
      paymentIntentStatus: paymentIntent.status,
      paymentIntentClientSecret: paymentIntent.client_secret ? "present" : "absent",
      receiptEmail: paymentIntent.receipt_email || null,
      paymentMethodTypes: paymentIntent.payment_method_types || [],
      automaticPaymentMethods: paymentIntent.automatic_payment_methods || null,
    }

    // Write to multiple collections for redundancy and compatibility using Firestore batch
    const batch = db.batch()

    // 1. Main purchases collection (with payment intent ID as document ID for easy lookup)
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

    // 5. Product-specific purchases for analytics
    const productPurchaseRef = db
      .collection("productBoxes")
      .doc(actualProductId)
      .collection("purchases")
      .doc(paymentIntent.id)
    batch.set(productPurchaseRef, {
      userId,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      purchasedAt: new Date(),
      verificationMethod: "payment_intent_direct",
    })

    await batch.commit()
    console.log(`✅ [Payment Verify] All purchase records written to Firestore`)

    // Update product box sales counter and analytics
    await db
      .collection("productBoxes")
      .doc(actualProductId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(paymentIntent.amount / 100),
        lastPurchaseAt: new Date(),
        lastPurchaseBy: userId,
      })

    console.log(`✅ [Payment Verify] Product sales counter updated`)

    // Record the sale for the creator with platform fee calculation
    if (creatorId) {
      const platformFeeRate = 0.25 // 25% platform fee
      const grossAmount = paymentIntent.amount / 100
      const netAmount = grossAmount * (1 - platformFeeRate)
      const platformFee = grossAmount * platformFeeRate

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
          amount: grossAmount,
          amountReceived: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : grossAmount,
          platformFee: platformFee,
          netAmount: netAmount,
          currency: paymentIntent.currency,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productData.title || "Untitled Product",
          buyerEmail: paymentIntent.receipt_email || "",
          verificationMethod: "payment_intent_direct",
          paymentIntentStatus: paymentIntent.status,
        })

      // Increment the creator's total sales and revenue
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(grossAmount),
          totalNetRevenue: db.FieldValue.increment(netAmount),
          lastSaleAt: new Date(),
          lastSaleAmount: grossAmount,
        })

      console.log(`✅ [Payment Verify] Creator sales record updated for ${creatorId}`)
    }

    console.log(
      `🎉 [Payment Verify] Successfully verified and recorded purchase for payment intent: ${paymentIntentId}`,
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
        receiptEmail: paymentIntent.receipt_email,
      },
      productBox: {
        id: actualProductId,
        title: productData.title,
        description: productData.description,
        thumbnailUrl: productData.thumbnailUrl,
        price: productData.price,
      },
      creator: creatorData
        ? {
            id: creatorId,
            name: creatorData.displayName || creatorData.name,
            username: creatorData.username,
          }
        : null,
      verificationDetails: {
        method: "payment_intent_direct",
        verifiedAt: new Date().toISOString(),
        connectedAccount: connectedAccountId || null,
        duplicateCheck: false,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Payment Verify] Unexpected error verifying payment intent:`, error)
    return NextResponse.json(
      {
        error: "Payment verification failed due to server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

async function checkExistingPurchase(paymentIntentId: string) {
  try {
    console.log(`🔍 [Payment Verify] Checking for existing purchase: ${paymentIntentId}`)

    // Check main purchases collection first (most efficient)
    const mainPurchaseDoc = await db.collection("purchases").doc(paymentIntentId).get()
    if (mainPurchaseDoc.exists()) {
      console.log(`✅ [Payment Verify] Found existing purchase in main collection`)
      return mainPurchaseDoc.data()
    }

    // Check if any purchase has this payment intent ID as a fallback
    const purchasesQuery = await db
      .collection("purchases")
      .where("paymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get()

    if (!purchasesQuery.empty) {
      console.log(`✅ [Payment Verify] Found existing purchase via query`)
      return purchasesQuery.docs[0].data()
    }

    console.log(`ℹ️ [Payment Verify] No existing purchase found`)
    return null
  } catch (error) {
    console.error("❌ [Payment Verify] Error checking existing purchase:", error)
    return null
  }
}
