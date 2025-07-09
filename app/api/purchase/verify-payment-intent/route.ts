import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Payment Intent Verification] Starting verification process")

    const decodedToken = await requireAuth(request)
    const { paymentIntentId, accountId } = await request.json()

    if (!paymentIntentId) {
      console.error("❌ [Payment Intent Verification] Missing payment intent ID")
      return NextResponse.json(
        {
          success: false,
          error: "Payment intent ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Payment Intent Verification] Verifying payment intent: ${paymentIntentId}`)
    console.log(`👤 [Payment Intent Verification] User: ${decodedToken.uid}`)
    console.log(`🏦 [Payment Intent Verification] Account ID: ${accountId || "none"}`)

    // Retrieve payment intent from Stripe
    let paymentIntent
    try {
      const stripeOptions = accountId ? { stripeAccount: accountId } : {}
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, stripeOptions)

      console.log(`✅ [Payment Intent Verification] Payment intent retrieved:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer: paymentIntent.customer,
        metadata: paymentIntent.metadata,
      })
    } catch (stripeError: any) {
      console.error("❌ [Payment Intent Verification] Stripe error:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve payment information from Stripe",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    // Verify payment was successful
    if (paymentIntent.status !== "succeeded") {
      console.error(`❌ [Payment Intent Verification] Payment not successful: ${paymentIntent.status}`)
      return NextResponse.json(
        {
          success: false,
          error: `Payment status is ${paymentIntent.status}, expected succeeded`,
        },
        { status: 400 },
      )
    }

    // Extract product information from metadata
    const productBoxId = paymentIntent.metadata.productBoxId || paymentIntent.metadata.vaultId
    const creatorId = paymentIntent.metadata.creatorId || paymentIntent.metadata.creatorUid

    if (!productBoxId) {
      console.error("❌ [Payment Intent Verification] No product ID in payment metadata")
      return NextResponse.json(
        {
          success: false,
          error: "Product information not found in payment",
        },
        { status: 400 },
      )
    }

    console.log(`📦 [Payment Intent Verification] Product: ${productBoxId}`)
    console.log(`👨‍💼 [Payment Intent Verification] Creator: ${creatorId}`)

    // Get product details
    let productDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productDoc.exists) {
      productDoc = await db.collection("bundles").doc(productBoxId).get()
    }

    if (!productDoc.exists) {
      console.error(`❌ [Payment Intent Verification] Product not found: ${productBoxId}`)
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 },
      )
    }

    const productData = productDoc.data()!
    console.log(`✅ [Payment Intent Verification] Product found: ${productData.title}`)

    // Check if user already has this purchase
    const existingPurchase = await db
      .collection("users")
      .doc(decodedToken.uid)
      .collection("purchases")
      .where("productBoxId", "==", productBoxId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log(`ℹ️ [Payment Intent Verification] User already owns this product`)
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        message: "You already own this product",
        product: {
          id: productBoxId,
          title: productData.title,
          price: productData.price,
        },
      })
    }

    // Calculate amounts
    const totalAmount = paymentIntent.amount / 100 // Convert from cents
    const platformFeeAmount = paymentIntent.application_fee_amount ? paymentIntent.application_fee_amount / 100 : 0
    const creatorAmount = totalAmount - platformFeeAmount

    console.log(`💰 [Payment Intent Verification] Payment breakdown:`, {
      total: totalAmount,
      platformFee: platformFeeAmount,
      creatorAmount: creatorAmount,
    })

    // Create purchase record
    const purchaseData = {
      productBoxId,
      vaultId: productBoxId, // For backward compatibility
      userId: decodedToken.uid,
      creatorId: creatorId || productData.creatorId,
      paymentIntentId: paymentIntent.id,
      stripeAccountId: accountId || null,
      amount: totalAmount,
      currency: paymentIntent.currency,
      platformFee: platformFeeAmount,
      creatorAmount: creatorAmount,
      productTitle: productData.title,
      productType: "product_box",
      status: "completed",
      purchaseDate: new Date(),
      createdAt: new Date(),
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomer: paymentIntent.customer,
        paymentMethod: paymentIntent.payment_method,
        receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url,
      },
    }

    // Store purchase in multiple locations for redundancy
    const batch = db.batch()

    // 1. User's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(decodedToken.uid).collection("purchases").doc(paymentIntent.id)
    batch.set(userPurchaseRef, purchaseData)

    // 2. Global purchases collection
    const globalPurchaseRef = db.collection("purchases").doc(paymentIntent.id)
    batch.set(globalPurchaseRef, purchaseData)

    // 3. Creator's sales subcollection (if creator exists)
    if (creatorId) {
      const creatorSaleRef = db.collection("users").doc(creatorId).collection("sales").doc(paymentIntent.id)
      batch.set(creatorSaleRef, {
        ...purchaseData,
        buyerId: decodedToken.uid,
        saleDate: new Date(),
      })
    }

    // 4. Product sales tracking
    const productSaleRef = db.collection("productBoxes").doc(productBoxId).collection("sales").doc(paymentIntent.id)
    batch.set(productSaleRef, purchaseData)

    // Commit all writes
    await batch.commit()

    console.log(`✅ [Payment Intent Verification] Purchase recorded successfully`)

    // Update product analytics
    try {
      await db
        .collection("productBoxes")
        .doc(productBoxId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(totalAmount),
          lastSaleDate: new Date(),
        })
      console.log(`✅ [Payment Intent Verification] Product analytics updated`)
    } catch (analyticsError) {
      console.error("⚠️ [Payment Intent Verification] Failed to update analytics:", analyticsError)
      // Don't fail the whole request for analytics
    }

    return NextResponse.json({
      success: true,
      message: "Purchase verified and recorded successfully",
      purchase: {
        id: paymentIntent.id,
        productId: productBoxId,
        productTitle: productData.title,
        amount: totalAmount,
        currency: paymentIntent.currency,
        purchaseDate: new Date().toISOString(),
      },
      product: {
        id: productBoxId,
        title: productData.title,
        description: productData.description,
        thumbnailUrl: productData.thumbnailUrl,
      },
    })
  } catch (error: any) {
    console.error("❌ [Payment Intent Verification] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
