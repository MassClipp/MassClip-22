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

    console.log("🔍 [Bulk Sync] Starting bulk sync for user:", userId)

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
        },
        { status: 400 },
      )
    }

    // Get all unsynced product boxes for this user
    const unsyncedSnapshot = await db
      .collection("productBoxes")
      .where("creatorId", "==", userId)
      .where("productId", "==", null)
      .get()

    const unsyncedBoxes = unsyncedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`🔍 [Bulk Sync] Found ${unsyncedBoxes.length} unsynced product boxes`)

    if (unsyncedBoxes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All product boxes are already synced",
        syncedCount: 0,
        failedCount: 0,
      })
    }

    // Verify Stripe account status
    const account = await stripe.accounts.retrieve(stripeAccountId)
    if (!account.charges_enabled) {
      return NextResponse.json(
        {
          error: "Stripe account cannot accept payments yet",
          code: "CHARGES_DISABLED",
        },
        { status: 400 },
      )
    }

    const results = {
      syncedCount: 0,
      failedCount: 0,
      errors: [] as any[],
    }

    // Sync each product box
    for (const productBox of unsyncedBoxes) {
      try {
        console.log(`🔍 [Bulk Sync] Syncing product box: ${productBox.id}`)

        // Prepare product data - only include description if it's not empty
        const productData: Stripe.ProductCreateParams = {
          name: productBox.title || "Untitled Product",
          metadata: {
            creatorId: userId,
            creatorUsername: userData?.username || "unknown",
            type: "product_box",
            platform: "massclip",
            productBoxId: productBox.id,
          },
        }

        // Only add description if it exists and is not empty
        const description = productBox.description?.trim()
        if (description && description.length > 0) {
          productData.description = description
        }

        console.log(`🔍 [Bulk Sync] Creating product with data:`, productData)

        // Create Stripe Product
        const product = await stripe.products.create(productData, {
          stripeAccount: stripeAccountId,
        })

        // Create Stripe Price
        const priceData: Stripe.PriceCreateParams = {
          product: product.id,
          unit_amount: Math.round((productBox.price || 0) * 100),
          currency: productBox.currency || "usd",
          metadata: {
            creatorId: userId,
            type: "product_box",
            platform: "massclip",
            productBoxId: productBox.id,
          },
        }

        if (productBox.type === "subscription") {
          priceData.recurring = { interval: "month" }
        }

        const price = await stripe.prices.create(priceData, {
          stripeAccount: stripeAccountId,
        })

        // Update product box
        await db.collection("productBoxes").doc(productBox.id).update({
          productId: product.id,
          priceId: price.id,
          stripeStatus: "synced",
          stripeError: null,
          updatedAt: new Date(),
        })

        results.syncedCount++
        console.log(`✅ [Bulk Sync] Synced product box: ${productBox.id}`)

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.error(`❌ [Bulk Sync] Failed to sync product box ${productBox.id}:`, error)
        results.failedCount++
        results.errors.push({
          productBoxId: productBox.id,
          title: productBox.title,
          error: error.message,
        })

        // Update product box with error
        await db.collection("productBoxes").doc(productBox.id).update({
          stripeStatus: "failed",
          stripeError: error.message,
          updatedAt: new Date(),
        })
      }
    }

    console.log(`✅ [Bulk Sync] Completed: ${results.syncedCount} synced, ${results.failedCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Bulk sync completed: ${results.syncedCount} synced, ${results.failedCount} failed`,
      ...results,
    })
  } catch (error: any) {
    console.error("❌ [Bulk Sync] Error:", error)

    // Log detailed error information
    console.error("❌ [Bulk Sync] Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
      requestId: error.requestId,
      stack: error.stack,
    })

    // Add more specific error handling
    let errorMessage = "Failed to perform bulk sync"
    let errorCode = "UNKNOWN_ERROR"

    if (error.type === "StripeAuthenticationError") {
      errorMessage = "Stripe authentication failed. Please reconnect your account."
      errorCode = "STRIPE_AUTH_ERROR"
    } else if (error.type === "StripePermissionError") {
      errorMessage = "Your Stripe account doesn't have permission for this operation."
      errorCode = "STRIPE_PERMISSION_ERROR"
    } else if (error.type === "StripeRateLimitError") {
      errorMessage = "Too many requests to Stripe. Please try again in a few moments."
      errorCode = "STRIPE_RATE_LIMIT"
    } else if (error.type === "StripeConnectionError") {
      errorMessage = "Could not connect to Stripe. Please check your internet connection."
      errorCode = "STRIPE_CONNECTION_ERROR"
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        details: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
