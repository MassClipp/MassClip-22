import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { productBoxId } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log("🔍 [Stripe Sync] Syncing product box:", productBoxId)

    // Get product box
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    if (productBoxData?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get user's Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          error: "Stripe account not connected",
          code: "NO_STRIPE_ACCOUNT",
          suggestedActions: [
            "Go to Dashboard > Settings > Stripe",
            "Click 'Connect with Stripe'",
            "Complete the onboarding process",
          ],
        },
        { status: 400 },
      )
    }

    // Check if already synced
    if (productBoxData?.productId && productBoxData?.priceId) {
      return NextResponse.json({
        success: true,
        message: "Product box is already synced with Stripe",
        productId: productBoxData.productId,
        priceId: productBoxData.priceId,
      })
    }

    // Verify Stripe account status
    const account = await stripe.accounts.retrieve(stripeAccountId)
    if (!account.charges_enabled) {
      return NextResponse.json(
        {
          error: "Stripe account cannot accept payments yet",
          code: "CHARGES_DISABLED",
          suggestedActions: [
            "Complete your Stripe onboarding",
            "Submit any pending verification documents",
            "Check your email for Stripe verification requests",
          ],
        },
        { status: 400 },
      )
    }

    // Prepare product data - only include description if it's not empty
    const productData: Stripe.ProductCreateParams = {
      name: productBoxData?.title || "Untitled Product",
      metadata: {
        creatorId: userId,
        creatorUsername: userData?.username || "unknown",
        type: "product_box",
        platform: "massclip",
        productBoxId: productBoxId,
      },
    }

    // Only add description if it exists and is not empty
    const description = productBoxData?.description?.trim()
    if (description && description.length > 0) {
      productData.description = description
    }

    console.log("🔍 [Stripe Sync] Creating product with data:", productData)

    // Create Stripe Product
    const product = await stripe.products.create(productData, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Stripe Sync] Product created:", product.id)

    // Create Stripe Price
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: Math.round((productBoxData?.price || 0) * 100), // Convert to cents
      currency: productBoxData?.currency || "usd",
      metadata: {
        creatorId: userId,
        type: "product_box",
        platform: "massclip",
        productBoxId: productBoxId,
      },
    }

    // Add recurring billing for subscriptions
    if (productBoxData?.type === "subscription") {
      priceData.recurring = { interval: "month" }
    }

    console.log("🔍 [Stripe Sync] Creating price with data:", priceData)

    const price = await stripe.prices.create(priceData, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Stripe Sync] Price created:", price.id)

    // Update product box with Stripe IDs
    await db.collection("productBoxes").doc(productBoxId).update({
      productId: product.id,
      priceId: price.id,
      stripeStatus: "synced",
      stripeError: null,
      updatedAt: new Date(),
    })

    console.log("✅ [Stripe Sync] Product box updated with Stripe IDs")

    return NextResponse.json({
      success: true,
      message: "Product box successfully synced with Stripe",
      productId: product.id,
      priceId: price.id,
      stripeAccountId: stripeAccountId,
    })
  } catch (error: any) {
    console.error("❌ [Stripe Sync] Error:", error)

    // Log detailed error for debugging
    console.error("❌ [Stripe Sync] Error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      statusCode: error.statusCode,
    })

    return NextResponse.json(
      {
        error: "Failed to sync with Stripe",
        details: error.message || "Unknown error",
        code: error.code || "SYNC_FAILED",
        param: error.param || null,
        suggestedActions: [
          "Check your Stripe account status",
          "Verify your internet connection",
          "Try again in a few moments",
          "Contact support if the issue persists",
        ],
      },
      { status: 500 },
    )
  }
}
