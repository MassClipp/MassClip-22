import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    const body = await request.json()
    const { successUrl, cancelUrl } = body

    console.log(`🛒 [Checkout] Creating checkout session for bundle: ${bundleId}`)

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      // Try productBoxes collection as fallback
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (!productBoxDoc.exists) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }
    }

    const bundleData = bundleDoc.exists
      ? bundleDoc.data()
      : (await db.collection("productBoxes").doc(bundleId).get()).data()
    if (!bundleData) {
      return NextResponse.json({ error: "Bundle data not found" }, { status: 404 })
    }

    // Get creator data
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    if (!creatorData?.stripeAccountId) {
      return NextResponse.json({ error: "Creator has not connected Stripe account" }, { status: 400 })
    }

    // Create or get Stripe product and price
    let productId = bundleData.productId
    let priceId = bundleData.priceId

    if (!productId || !priceId) {
      console.log(`🔄 [Checkout] Creating Stripe product for bundle: ${bundleId}`)

      // Create product
      const product = await stripe.products.create(
        {
          name: bundleData.title,
          description: bundleData.description || `Premium content bundle by ${creatorData.username}`,
          metadata: {
            bundleId,
            creatorId: bundleData.creatorId,
          },
        },
        {
          stripeAccount: creatorData.stripeAccountId,
        },
      )

      // Create price
      const price = await stripe.prices.create(
        {
          unit_amount: Math.round(bundleData.price * 100),
          currency: bundleData.currency || "usd",
          product: product.id,
          metadata: {
            bundleId,
            creatorId: bundleData.creatorId,
          },
        },
        {
          stripeAccount: creatorData.stripeAccountId,
        },
      )

      productId = product.id
      priceId = price.id

      // Update bundle with Stripe IDs
      const updateData = {
        productId,
        priceId,
        updatedAt: new Date(),
      }

      if (bundleDoc.exists) {
        await bundleDoc.ref.update(updateData)
      } else {
        await db.collection("productBoxes").doc(bundleId).update(updateData)
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          bundleId,
          creatorId: bundleData.creatorId,
          buyerId: decodedToken.uid,
        },
        payment_intent_data: {
          application_fee_amount: Math.round(bundleData.price * 100 * 0.1), // 10% platform fee
          metadata: {
            bundleId,
            creatorId: bundleData.creatorId,
            buyerId: decodedToken.uid,
          },
        },
      },
      {
        stripeAccount: creatorData.stripeAccountId,
      },
    )

    console.log(`✅ [Checkout] Created checkout session: ${session.id}`)

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("❌ [Checkout] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    let bundleData = null

    if (bundleDoc.exists) {
      bundleData = { id: bundleDoc.id, ...bundleDoc.data() }
    } else {
      // Try productBoxes collection as fallback
      const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (productBoxDoc.exists) {
        bundleData = { id: productBoxDoc.id, ...productBoxDoc.data() }
      }
    }

    if (!bundleData) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      bundle: bundleData,
    })
  } catch (error) {
    console.error("❌ [Checkout] Error getting bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to get bundle",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
