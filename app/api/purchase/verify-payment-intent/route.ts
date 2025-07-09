import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Payment Verification] === STARTING PAYMENT INTENT VERIFICATION ===`)

    const decodedToken = await requireAuth(request)
    const { paymentIntentId, accountId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 })
    }

    const userId = decodedToken.uid
    console.log(`🔍 [Payment Verification] Payment Intent: ${paymentIntentId}`)
    console.log(`🔍 [Payment Verification] User: ${userId}`)
    console.log(`🔍 [Payment Verification] Account ID: ${accountId || "none"}`)

    // Check if this purchase has already been processed
    const existingPurchaseQuery = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("paymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get()

    if (!existingPurchaseQuery.empty) {
      const existingPurchase = existingPurchaseQuery.docs[0].data()
      console.log(`✅ [Payment Verification] Purchase already processed:`, existingPurchase)

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: "This purchase has already been verified and processed",
        purchase: existingPurchase,
        verificationDetails: {
          method: "duplicate_check",
          verifiedAt: new Date().toISOString(),
          duplicateCheck: true,
        },
      })
    }

    // Retrieve payment intent from Stripe
    let paymentIntent
    try {
      if (accountId) {
        console.log(`🔍 [Payment Verification] Retrieving from connected account: ${accountId}`)
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          stripeAccount: accountId,
        })
      } else {
        console.log(`🔍 [Payment Verification] Retrieving from platform account`)
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      }
    } catch (stripeError: any) {
      console.error(`❌ [Payment Verification] Failed to retrieve payment intent:`, stripeError)
      return NextResponse.json(
        {
          error: "Failed to retrieve payment information",
          details: stripeError.message,
          code: stripeError.code,
        },
        { status: 400 },
      )
    }

    console.log(`✅ [Payment Verification] Payment Intent retrieved:`, {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      receiptEmail: paymentIntent.receipt_email,
    })

    // Validate payment status
    if (paymentIntent.status !== "succeeded") {
      console.error(`❌ [Payment Verification] Payment not succeeded: ${paymentIntent.status}`)
      return NextResponse.json(
        {
          error: "Payment not completed successfully",
          paymentStatus: paymentIntent.status,
        },
        { status: 400 },
      )
    }

    // Extract metadata
    const metadata = paymentIntent.metadata || {}
    const productBoxId = metadata.productBoxId || metadata.vaultId
    const creatorId = metadata.creatorUid || metadata.creatorId

    console.log(`🔍 [Payment Verification] Metadata:`, {
      productBoxId,
      creatorId,
      buyerUid: metadata.buyerUid,
      connectedAccountId: metadata.connectedAccountId,
    })

    if (!productBoxId) {
      console.error(`❌ [Payment Verification] No product box ID in metadata`)
      return NextResponse.json({ error: "Invalid payment metadata - missing product information" }, { status: 400 })
    }

    // Get product box details
    let productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      // Try bundles collection as fallback
      productBoxDoc = await db.collection("bundles").doc(productBoxId).get()
    }

    if (!productBoxDoc.exists) {
      console.error(`❌ [Payment Verification] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`✅ [Payment Verification] Product box found:`, {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
    })

    // Get creator details
    let creatorData = null
    if (creatorId || productBoxData.creatorId) {
      const creatorDoc = await db
        .collection("users")
        .doc(creatorId || productBoxData.creatorId)
        .get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Check if user already has access to this product
    const existingAccessQuery = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", productBoxId)
      .limit(1)
      .get()

    if (!existingAccessQuery.empty) {
      console.log(`✅ [Payment Verification] User already owns this product`)
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        message: "You already own this content",
        purchase: existingAccessQuery.docs[0].data(),
        productBox: {
          id: productBoxId,
          title: productBoxData.title,
          description: productBoxData.description,
          thumbnailUrl: productBoxData.thumbnailUrl,
          price: productBoxData.price,
        },
        creator: creatorData
          ? {
              id: creatorData.uid || creatorId,
              name: creatorData.displayName || creatorData.name,
              username: creatorData.username,
            }
          : null,
      })
    }

    // Create purchase record
    const purchaseData = {
      paymentIntentId: paymentIntent.id,
      productBoxId,
      vaultId: productBoxId, // For backward compatibility
      productTitle: productBoxData.title,
      productDescription: productBoxData.description,
      thumbnailUrl: productBoxData.thumbnailUrl,
      amount: paymentIntent.amount / 100, // Convert from cents
      amountReceived: paymentIntent.amount_received / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      creatorId: creatorId || productBoxData.creatorId,
      creatorName: creatorData?.displayName || creatorData?.name,
      creatorUsername: creatorData?.username,
      connectedAccountId: accountId || metadata.connectedAccountId,
      receiptEmail: paymentIntent.receipt_email,
      purchasedAt: new Date(),
      verifiedAt: new Date(),
      verificationMethod: "payment_intent_direct",
      metadata: metadata,
    }

    console.log(`🔄 [Payment Verification] Creating purchase record:`, purchaseData)

    // Store purchase in user's purchases subcollection
    await db.collection("users").doc(userId).collection("purchases").doc(paymentIntent.id).set(purchaseData)

    // Also store in global purchases collection for analytics
    await db
      .collection("purchases")
      .doc(paymentIntent.id)
      .set({
        ...purchaseData,
        buyerId: userId,
        buyerEmail: decodedToken.email,
      })

    // Grant access to the product box content
    await db
      .collection("users")
      .doc(userId)
      .collection("productBoxAccess")
      .doc(productBoxId)
      .set({
        productBoxId,
        grantedAt: new Date(),
        paymentIntentId: paymentIntent.id,
        purchaseAmount: paymentIntent.amount / 100,
        accessLevel: "full",
      })

    console.log(`✅ [Payment Verification] Purchase verified and access granted`)

    return NextResponse.json({
      success: true,
      message: "Payment verified and access granted successfully",
      purchase: purchaseData,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        amountReceived: paymentIntent.amount_received / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        receiptEmail: paymentIntent.receipt_email,
      },
      productBox: {
        id: productBoxId,
        title: productBoxData.title,
        description: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl,
        price: productBoxData.price,
      },
      creator: creatorData
        ? {
            id: creatorData.uid || creatorId,
            name: creatorData.displayName || creatorData.name,
            username: creatorData.username,
          }
        : null,
      verificationDetails: {
        method: "payment_intent_direct",
        verifiedAt: new Date().toISOString(),
        connectedAccount: accountId || metadata.connectedAccountId || null,
        duplicateCheck: false,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Payment Verification] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
