import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🛒 [Checkout] === STARTING CHECKOUT PROCESS ===`)
  console.log(`🛒 [Checkout] Product Box ID: ${params.id}`)
  console.log(`🛒 [Checkout] Request URL: ${req.url}`)
  console.log(`🛒 [Checkout] Request method: ${req.method}`)

  try {
    // Log environment variables (without exposing secrets)
    console.log(`🔍 [Checkout] Environment check:`, {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    })

    // Import dependencies with error handling
    let db, verifyIdToken, stripe
    try {
      const firebaseAdmin = await import("@/lib/firebase-admin")
      db = firebaseAdmin.db
      verifyIdToken = firebaseAdmin.verifyIdToken
      console.log(`✅ [Checkout] Firebase admin imported successfully`)
    } catch (firebaseError) {
      console.error(`❌ [Checkout] Firebase admin import failed:`, firebaseError)
      return new NextResponse(`Firebase configuration error: ${firebaseError.message}`, { status: 500 })
    }

    try {
      const stripeLib = await import("@/lib/stripe")
      stripe = stripeLib.stripe
      console.log(`✅ [Checkout] Stripe imported successfully`)
    } catch (stripeError) {
      console.error(`❌ [Checkout] Stripe import failed:`, stripeError)
      return new NextResponse(`Stripe configuration error: ${stripeError.message}`, { status: 500 })
    }

    // Validate auth with better error handling
    const authHeader = req.headers.get("authorization")
    console.log(`🔍 [Checkout] Auth header present: ${!!authHeader}`)

    if (!authHeader?.startsWith("Bearer ")) {
      console.error(`❌ [Checkout] Invalid auth header format`)
      return new NextResponse("Unauthorized - Invalid auth header", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log(`🔍 [Checkout] Token length: ${token?.length || 0}`)

    let decodedToken, userId
    try {
      decodedToken = await verifyIdToken(token)
      userId = decodedToken.uid
      console.log(`✅ [Checkout] Token verified for user: ${userId}`)
    } catch (authError) {
      console.error(`❌ [Checkout] Token verification failed:`, authError)
      return new NextResponse(`Authentication failed: ${authError.message}`, { status: 401 })
    }

    // Parse request body with error handling
    let body
    try {
      body = await req.json()
      console.log(`✅ [Checkout] Request body parsed:`, Object.keys(body))
    } catch (parseError) {
      console.error(`❌ [Checkout] Failed to parse request body:`, parseError)
      return new NextResponse("Invalid request body", { status: 400 })
    }

    const { successUrl, cancelUrl } = body

    // Get product box with detailed error handling
    let productBoxDoc, productBox
    try {
      productBoxDoc = await db.collection("productBoxes").doc(params.id).get()
      console.log(`🔍 [Checkout] Product box query executed, exists: ${productBoxDoc.exists}`)

      if (!productBoxDoc.exists) {
        console.error(`❌ [Checkout] Product box not found: ${params.id}`)
        return new NextResponse("Product box not found", { status: 404 })
      }

      productBox = productBoxDoc.data()
      console.log(`✅ [Checkout] Product box data retrieved:`, {
        id: params.id,
        title: productBox?.title,
        price: productBox?.price,
        priceType: typeof productBox?.price,
        active: productBox?.active,
        creatorId: productBox?.creatorId,
        hasDescription: !!productBox?.description,
      })
    } catch (firestoreError) {
      console.error(`❌ [Checkout] Firestore query failed:`, firestoreError)
      return new NextResponse(`Database error: ${firestoreError.message}`, { status: 500 })
    }

    // Enhanced validation with specific error messages
    if (!productBox?.title) {
      console.error(`❌ [Checkout] Product box missing title: ${params.id}`)
      return new NextResponse("Product box missing title", { status: 400 })
    }

    if (!productBox?.price || typeof productBox.price !== "number" || productBox.price <= 0) {
      console.error(`❌ [Checkout] Product box invalid price:`, {
        id: params.id,
        price: productBox?.price,
        type: typeof productBox?.price,
      })
      return new NextResponse("Product box has invalid price", { status: 400 })
    }

    // Check if price meets Stripe minimum (50 cents)
    if (productBox.price < 50) {
      console.error(`❌ [Checkout] Price below Stripe minimum:`, {
        price: productBox.price,
        minimum: 50,
      })
      return new NextResponse("Price must be at least $0.50", { status: 400 })
    }

    if (!productBox?.creatorId) {
      console.error(`❌ [Checkout] Product box missing creator: ${params.id}`)
      return new NextResponse("Product box missing creator", { status: 400 })
    }

    if (productBox.active === false) {
      console.error(`❌ [Checkout] Product box not active: ${params.id}`)
      return new NextResponse("Product box is not active", { status: 400 })
    }

    // Get creator with detailed error handling
    let creatorDoc, creatorData
    try {
      creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
      console.log(`🔍 [Checkout] Creator query executed, exists: ${creatorDoc.exists}`)

      if (!creatorDoc.exists) {
        console.error(`❌ [Checkout] Creator not found: ${productBox.creatorId}`)
        return new NextResponse("Creator not found", { status: 404 })
      }

      creatorData = creatorDoc.data()
      console.log(`✅ [Checkout] Creator data retrieved:`, {
        id: productBox.creatorId,
        username: creatorData?.username,
        displayName: creatorData?.displayName,
        hasStripeAccount: !!creatorData?.stripeAccountId,
        stripeOnboardingComplete: creatorData?.stripeOnboardingComplete,
      })
    } catch (creatorError) {
      console.error(`❌ [Checkout] Creator query failed:`, creatorError)
      return new NextResponse(`Creator lookup error: ${creatorError.message}`, { status: 500 })
    }

    if (!creatorData?.stripeAccountId) {
      console.error(`❌ [Checkout] Creator missing Stripe account: ${productBox.creatorId}`)
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    // Create checkout session with enhanced error handling
    console.log(`🔄 [Checkout] Creating Stripe session...`)

    const sessionData = {
      mode: "payment" as const,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title,
              description:
                productBox.description ||
                `Product box by ${creatorData.username || creatorData.displayName || "Creator"}`,
            },
            unit_amount: Math.round(productBox.price), // Ensure it's an integer
          },
          quantity: 1,
        },
      ],
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${params.id}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username || "unknown"}`,
      metadata: {
        productBoxId: params.id,
        buyerUid: userId,
        creatorUid: productBox.creatorId,
        type: "product_box_purchase",
      },
      payment_intent_data: {
        application_fee_amount: Math.round(productBox.price * 0.25), // 25% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
      },
    }

    console.log(`🔄 [Checkout] Session data prepared:`, {
      amount: sessionData.line_items[0].price_data.unit_amount,
      applicationFee: sessionData.payment_intent_data.application_fee_amount,
      productName: sessionData.line_items[0].price_data.product_data.name,
      stripeAccount: creatorData.stripeAccountId,
    })

    let session
    try {
      session = await stripe.checkout.sessions.create(sessionData)
      console.log(`✅ [Checkout] Session created successfully: ${session.id}`)
    } catch (stripeError) {
      console.error(`❌ [Checkout] Stripe session creation failed:`, {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
      })
      return new NextResponse(`Payment system error: ${stripeError.message}`, { status: 500 })
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("❌ [CHECKOUT] CRITICAL UNHANDLED ERROR:", error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error("❌ [CHECKOUT] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 10), // First 10 lines of stack
      })
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return new NextResponse(`Checkout failed: ${errorMessage}`, { status: 500 })
  }
}
