import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🛒 [Checkout] === STARTING CHECKOUT PROCESS ===`)
  console.log(`🛒 [Checkout] Product Box ID: ${params.id}`)

  try {
    // Import dependencies with error handling
    let db, verifyIdToken, stripe

    try {
      const firebaseAdmin = await import("@/lib/firebase-admin")
      db = firebaseAdmin.db
      verifyIdToken = firebaseAdmin.verifyIdToken || firebaseAdmin.auth.verifyIdToken

      const stripeModule = await import("@/lib/stripe")
      stripe = stripeModule.stripe || stripeModule.default

      console.log(`✅ [Checkout] Dependencies loaded successfully`)
    } catch (importError) {
      console.error(`❌ [Checkout] Failed to import dependencies:`, importError)
      return new NextResponse("Server configuration error", { status: 500 })
    }

    // Validate auth
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error(`❌ [Checkout] Missing or invalid authorization header`)
      return new NextResponse("Unauthorized - Missing auth token", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken, userId

    try {
      decodedToken = await verifyIdToken(token)
      userId = decodedToken.uid
      console.log(`✅ [Checkout] User authenticated: ${userId}`)
    } catch (authError) {
      console.error(`❌ [Checkout] Auth verification failed:`, authError)
      return new NextResponse("Unauthorized - Invalid token", { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await req.json()
      console.log(`✅ [Checkout] Request body parsed:`, {
        hasSuccessUrl: !!body.successUrl,
        hasCancelUrl: !!body.cancelUrl,
      })
    } catch (parseError) {
      console.error(`❌ [Checkout] Failed to parse request body:`, parseError)
      return new NextResponse("Invalid request body", { status: 400 })
    }

    const { successUrl, cancelUrl } = body

    // Get product box with error handling - try both collections
    let productBoxDoc, productBox
    try {
      // Try bundles collection first
      productBoxDoc = await db.collection("bundles").doc(params.id).get()

      if (!productBoxDoc.exists) {
        // Fallback to productBoxes collection
        productBoxDoc = await db.collection("productBoxes").doc(params.id).get()
      }

      if (!productBoxDoc.exists) {
        console.error(`❌ [Checkout] Product box not found: ${params.id}`)
        return new NextResponse("Product box not found", { status: 404 })
      }

      productBox = productBoxDoc.data()
      console.log(`✅ [Checkout] Product box loaded:`, {
        id: params.id,
        title: productBox?.title,
        price: productBox?.price,
        active: productBox?.active,
        creatorId: productBox?.creatorId,
        hasStripeProductId: !!productBox?.productId,
        hasStripePriceId: !!productBox?.priceId,
      })
    } catch (dbError) {
      console.error(`❌ [Checkout] Database error fetching product box:`, dbError)
      return new NextResponse("Database error", { status: 500 })
    }

    // Validate product box data
    if (!productBox?.title) {
      console.error(`❌ [Checkout] Product box missing title: ${params.id}`)
      return new NextResponse("Product box missing required data", { status: 400 })
    }

    if (!productBox?.price || typeof productBox.price !== "number" || productBox.price <= 0) {
      console.error(`❌ [Checkout] Product box invalid price:`, productBox?.price)
      return new NextResponse("Product box has invalid price", { status: 400 })
    }

    if (!productBox?.creatorId) {
      console.error(`❌ [Checkout] Product box missing creator: ${params.id}`)
      return new NextResponse("Product box missing creator", { status: 400 })
    }

    if (productBox.active === false) {
      console.error(`❌ [Checkout] Product box not active: ${params.id}`)
      return new NextResponse("Product box is not active", { status: 400 })
    }

    // Get creator with error handling
    let creatorDoc, creatorData
    try {
      creatorDoc = await db.collection("users").doc(productBox.creatorId).get()

      if (!creatorDoc.exists) {
        console.error(`❌ [Checkout] Creator not found: ${productBox.creatorId}`)
        return new NextResponse("Creator not found", { status: 404 })
      }

      creatorData = creatorDoc.data()
      console.log(`✅ [Checkout] Creator loaded:`, {
        id: productBox.creatorId,
        username: creatorData?.username,
        hasStripeAccount: !!creatorData?.stripeAccountId,
        stripeOnboardingComplete: creatorData?.stripeOnboardingComplete,
      })
    } catch (dbError) {
      console.error(`❌ [Checkout] Database error fetching creator:`, dbError)
      return new NextResponse("Database error", { status: 500 })
    }

    if (!creatorData?.stripeAccountId) {
      console.error(`❌ [Checkout] Creator missing Stripe account: ${productBox.creatorId}`)
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ [Checkout] STRIPE_SECRET_KEY not configured")
      return new NextResponse("Payment system not configured", { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error("❌ [Checkout] NEXT_PUBLIC_SITE_URL not configured")
      return new NextResponse("Site URL not configured", { status: 500 })
    }

    // Check if user already owns this product
    try {
      const existingPurchase = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .where("productBoxId", "==", params.id)
        .limit(1)
        .get()

      if (!existingPurchase.empty) {
        console.log(`⚠️ [Checkout] User already owns product: ${params.id}`)
        return new NextResponse("You already own this product", { status: 400 })
      }
    } catch (dbError) {
      console.warn(`⚠️ [Checkout] Could not check existing purchases:`, dbError)
      // Continue anyway - this is not critical
    }

    // Convert price to cents and validate
    const priceInCents = Math.round(productBox.price * 100)
    if (priceInCents < 50) {
      // Stripe minimum is $0.50
      console.error(`❌ [Checkout] Price too low: $${productBox.price} (${priceInCents} cents)`)
      return new NextResponse("Price must be at least $0.50", { status: 400 })
    }

    // Calculate platform fee (25%)
    const platformFee = Math.round(priceInCents * 0.25)

    console.log(`💰 [Checkout] Price calculation:`, {
      originalPrice: productBox.price,
      priceInCents,
      platformFee,
      creatorAmount: priceInCents - platformFee,
    })

    // Create or get Stripe price
    let stripePriceId = productBox.priceId

    if (!stripePriceId) {
      console.log(`🔄 [Checkout] Creating Stripe product and price for bundle: ${params.id}`)

      try {
        // Create Stripe product if it doesn't exist
        let stripeProductId = productBox.productId

        if (!stripeProductId) {
          const stripeProduct = await stripe.products.create({
            name: productBox.title,
            description: productBox.description || `Premium content by ${creatorData.username || "Creator"}`,
            images: productBox.coverImage ? [productBox.coverImage] : [],
            metadata: {
              bundleId: params.id,
              creatorId: productBox.creatorId,
            },
          })
          stripeProductId = stripeProduct.id

          // Update bundle with Stripe product ID
          await db.collection("bundles").doc(params.id).update({
            productId: stripeProductId,
            updatedAt: new Date(),
          })

          console.log(`✅ [Checkout] Created Stripe product: ${stripeProductId}`)
        }

        // Create Stripe price
        const stripePrice = await stripe.prices.create({
          unit_amount: priceInCents,
          currency: "usd",
          product: stripeProductId,
          metadata: {
            bundleId: params.id,
            creatorId: productBox.creatorId,
          },
        })
        stripePriceId = stripePrice.id

        // Update bundle with Stripe price ID
        await db.collection("bundles").doc(params.id).update({
          priceId: stripePriceId,
          updatedAt: new Date(),
        })

        console.log(`✅ [Checkout] Created Stripe price: ${stripePriceId}`)
      } catch (stripeError) {
        console.error("❌ [Checkout] Failed to create Stripe product/price:", stripeError)
        return new NextResponse("Failed to create payment configuration", { status: 500 })
      }
    }

    // Create checkout session with comprehensive error handling
    console.log(`🔄 [Checkout] Creating Stripe session...`)

    const sessionData = {
      mode: "payment" as const,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${params.id}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username || "unknown"}`,
      client_reference_id: userId,
      metadata: {
        productBoxId: params.id,
        buyerUid: userId,
        creatorUid: productBox.creatorId,
        type: "product_box_purchase",
        productTitle: productBox.title,
      },
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          productBoxId: params.id,
          buyerUid: userId,
          creatorUid: productBox.creatorId,
        },
      },
    }

    console.log(`🔄 [Checkout] Session data prepared:`, {
      priceId: stripePriceId,
      productName: productBox.title,
      platformFee,
      stripeAccountId: creatorData.stripeAccountId,
    })

    let session
    try {
      session = await stripe.checkout.sessions.create(sessionData)
      console.log(`✅ [Checkout] Session created successfully: ${session.id}`)
    } catch (stripeError) {
      console.error("❌ [Checkout] Stripe session creation failed:", stripeError)

      // Handle specific Stripe errors
      if (stripeError.type === "StripeCardError") {
        return new NextResponse("Card error: " + stripeError.message, { status: 400 })
      } else if (stripeError.type === "StripeInvalidRequestError") {
        return new NextResponse("Invalid request: " + stripeError.message, { status: 400 })
      } else if (stripeError.type === "StripeAPIError") {
        return new NextResponse("Stripe API error. Please try again.", { status: 500 })
      } else if (stripeError.type === "StripeConnectionError") {
        return new NextResponse("Network error. Please check your connection.", { status: 500 })
      } else if (stripeError.type === "StripeAuthenticationError") {
        return new NextResponse("Payment system authentication error", { status: 500 })
      }

      return new NextResponse("Payment processing error: " + (stripeError.message || "Unknown error"), { status: 500 })
    }

    if (!session.url) {
      console.error(`❌ [Checkout] Session created but no URL returned`)
      return new NextResponse("Checkout session created but no redirect URL", { status: 500 })
    }

    console.log(`✅ [Checkout] === CHECKOUT PROCESS COMPLETED SUCCESSFULLY ===`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      success: true,
    })
  } catch (error) {
    console.error("❌ [CHECKOUT] CRITICAL UNEXPECTED ERROR:", error)

    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error("❌ [CHECKOUT] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 10), // First 10 lines of stack
      })
    }

    // Return a generic error message to avoid exposing internal details
    return new NextResponse("An unexpected error occurred during checkout. Please try again.", { status: 500 })
  }
}
