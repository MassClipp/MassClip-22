import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Payment Intent Verification] === STARTING VERIFICATION ===`)

    const decodedToken = await requireAuth(request)
    const { paymentIntentId, accountId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 })
    }

    const userId = decodedToken.uid
    console.log(`✅ [Payment Intent Verification] User authenticated: ${userId}`)
    console.log(`🔍 [Payment Intent Verification] Payment Intent: ${paymentIntentId}`)
    console.log(`🔍 [Payment Intent Verification] Account ID: ${accountId || "none"}`)

    // Check if this purchase has already been processed
    const existingPurchase = await UnifiedPurchaseService.getUserPurchaseByPaymentIntent(userId, paymentIntentId)
    if (existingPurchase) {
      console.log(`⚠️ [Payment Intent Verification] Purchase already processed`)

      // Get additional details for response
      const productBoxDoc = await db.collection("productBoxes").doc(existingPurchase.productBoxId).get()
      const productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

      let creatorData = null
      if (existingPurchase.creatorId) {
        const creatorDoc = await db.collection("users").doc(existingPurchase.creatorId).get()
        creatorData = creatorDoc.exists ? creatorDoc.data() : null
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: "This purchase was already verified and processed",
        purchase: existingPurchase,
        productBox: productBoxData
          ? {
              id: existingPurchase.productBoxId,
              title: productBoxData.title,
              description: productBoxData.description,
              thumbnailUrl: productBoxData.thumbnailUrl,
              price: productBoxData.price,
            }
          : null,
        creator: creatorData
          ? {
              id: existingPurchase.creatorId,
              name: creatorData.displayName || creatorData.name,
              username: creatorData.username,
            }
          : null,
        verificationDetails: {
          method: "payment_intent_direct",
          verifiedAt: new Date().toISOString(),
          connectedAccount: accountId,
          duplicateCheck: true,
        },
      })
    }

    // Retrieve payment intent from Stripe
    let paymentIntent
    try {
      if (accountId) {
        console.log(`🔍 [Payment Intent Verification] Retrieving from connected account: ${accountId}`)
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          stripeAccount: accountId,
        })
      } else {
        console.log(`🔍 [Payment Intent Verification] Retrieving from platform account`)
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      }
    } catch (stripeError: any) {
      console.error(`❌ [Payment Intent Verification] Stripe error:`, stripeError)
      return NextResponse.json(
        {
          error: "Failed to retrieve payment intent from Stripe",
          details: stripeError.message,
          code: stripeError.code,
        },
        { status: 400 },
      )
    }

    console.log(`📊 [Payment Intent Verification] Payment Intent Status: ${paymentIntent.status}`)
    console.log(`💰 [Payment Intent Verification] Amount: ${paymentIntent.amount} ${paymentIntent.currency}`)

    // Verify payment is successful
    if (paymentIntent.status !== "succeeded") {
      console.error(`❌ [Payment Intent Verification] Payment not successful: ${paymentIntent.status}`)
      return NextResponse.json(
        {
          error: `Payment not completed. Status: ${paymentIntent.status}`,
          paymentStatus: paymentIntent.status,
        },
        { status: 400 },
      )
    }

    // Extract metadata
    const metadata = paymentIntent.metadata || {}
    const { productBoxId, buyerUid, creatorUid, creatorId } = metadata

    console.log(`📝 [Payment Intent Verification] Metadata:`, metadata)

    // Validate that the buyer matches the authenticated user
    if (buyerUid && buyerUid !== userId) {
      console.error(`❌ [Payment Intent Verification] User mismatch: ${userId} vs ${buyerUid}`)
      return NextResponse.json({ error: "Payment intent does not belong to authenticated user" }, { status: 403 })
    }

    if (!productBoxId) {
      console.error(`❌ [Payment Intent Verification] No productBoxId in metadata`)
      return NextResponse.json({ error: "Invalid payment intent: missing product information" }, { status: 400 })
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Payment Intent Verification] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`✅ [Payment Intent Verification] Product found: ${productBoxData.title}`)

    // Get creator details
    const finalCreatorId = creatorUid || creatorId || productBoxData.creatorId
    let creatorData = null
    if (finalCreatorId) {
      const creatorDoc = await db.collection("users").doc(finalCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
      console.log(`✅ [Payment Intent Verification] Creator found: ${creatorData?.username || finalCreatorId}`)
    }

    // Check if user already owns this product (additional safety check)
    const existingAccess = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", productBoxId)
      .limit(1)
      .get()

    if (!existingAccess.empty) {
      console.log(`⚠️ [Payment Intent Verification] User already owns this product`)
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        message: "You already own this content",
        productBox: {
          id: productBoxId,
          title: productBoxData.title,
          description: productBoxData.description,
          thumbnailUrl: productBoxData.thumbnailUrl,
          price: productBoxData.price,
        },
        creator: creatorData
          ? {
              id: finalCreatorId,
              name: creatorData.displayName || creatorData.name,
              username: creatorData.username,
            }
          : null,
      })
    }

    // Create unified purchase record
    console.log(`🔄 [Payment Intent Verification] Creating unified purchase record`)
    await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      productBoxId,
      paymentIntentId,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      creatorId: finalCreatorId || "",
    })

    // Create main purchase record
    const purchaseData = {
      userId,
      buyerUid: userId,
      productBoxId,
      itemId: productBoxId,
      paymentIntentId,
      amount: paymentIntent.amount / 100,
      amountReceived: (paymentIntent.amount_received || paymentIntent.amount) / 100,
      currency: paymentIntent.currency,
      timestamp: new Date(),
      createdAt: new Date(),
      purchasedAt: new Date(),
      status: "completed",
      type: "product_box",
      itemTitle: productBoxData.title || "Untitled Product Box",
      itemDescription: productBoxData.description || "",
      thumbnailUrl: productBoxData.thumbnailUrl || "",
      customPreviewThumbnail: productBoxData.customPreviewThumbnail || "",
      creatorId: finalCreatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "",
      creatorUsername: creatorData?.username || "",
      accessUrl: `/product-box/${productBoxId}/content`,
      verificationMethod: "payment_intent_direct",
      verifiedAt: new Date(),
      connectedAccount: accountId || null,
    }

    // Write to main purchases collection with payment intent ID as document ID
    await db.collection("purchases").doc(paymentIntentId).set(purchaseData)

    // Also write to user's purchases subcollection
    await db.collection("users").doc(userId).collection("purchases").add(purchaseData)

    // Update product box sales counter
    await db
      .collection("productBoxes")
      .doc(productBoxId)
      .update({
        totalSales: db.FieldValue.increment(1),
        totalRevenue: db.FieldValue.increment(paymentIntent.amount / 100),
        lastPurchaseAt: new Date(),
      })

    // Record the sale for the creator
    if (finalCreatorId) {
      const platformFee = (paymentIntent.amount * 0.05) / 100 // 5% platform fee
      const netAmount = paymentIntent.amount / 100 - platformFee

      await db
        .collection("users")
        .doc(finalCreatorId)
        .collection("sales")
        .add({
          productBoxId,
          buyerUid: userId,
          paymentIntentId,
          amount: paymentIntent.amount / 100,
          platformFee,
          netAmount,
          purchasedAt: new Date(),
          status: "completed",
          productTitle: productBoxData.title || "Untitled Product Box",
          buyerEmail: decodedToken.email || "",
          verificationMethod: "payment_intent_direct",
        })

      // Increment the creator's total sales
      await db
        .collection("users")
        .doc(finalCreatorId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(paymentIntent.amount / 100),
          lastSaleAt: new Date(),
        })
    }

    console.log(`✅ [Payment Intent Verification] Purchase verification completed successfully`)

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        amountReceived: (paymentIntent.amount_received || paymentIntent.amount) / 100,
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
            id: finalCreatorId,
            name: creatorData.displayName || creatorData.name,
            username: creatorData.username,
          }
        : null,
      verificationDetails: {
        method: "payment_intent_direct",
        verifiedAt: new Date().toISOString(),
        connectedAccount: accountId,
        duplicateCheck: false,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Payment Intent Verification] Error:`, error)
    return NextResponse.json(
      {
        error: "Payment verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
