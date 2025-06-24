import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🛒 [Checkout] === STARTING CHECKOUT PROCESS ===`)
  console.log(`🛒 [Checkout] Product Box ID: ${params.id}`)

  try {
    // Step 1: Import dependencies with error handling
    console.log(`📦 [Checkout] Step 1: Loading dependencies...`)
    let db, verifyIdToken, stripe

    try {
      const firebaseAdmin = await import("@/lib/firebase-admin")
      db = firebaseAdmin.db
      verifyIdToken = firebaseAdmin.verifyIdToken
      console.log(`✅ [Checkout] Firebase Admin loaded`)
    } catch (firebaseError) {
      console.error(`❌ [Checkout] Firebase Admin import failed:`, firebaseError)
      return new NextResponse(`Firebase configuration error: ${firebaseError.message}`, { status: 500 })
    }

    try {
      const stripeLib = await import("@/lib/stripe")
      stripe = stripeLib.stripe
      console.log(`✅ [Checkout] Stripe loaded`)
    } catch (stripeError) {
      console.error(`❌ [Checkout] Stripe import failed:`, stripeError)
      return new NextResponse(`Stripe configuration error: ${stripeError.message}`, { status: 500 })
    }

    // Step 2: Validate request headers
    console.log(`🔑 [Checkout] Step 2: Validating authentication...`)
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Checkout] No authorization header provided")
      return new NextResponse("Unauthorized - No token provided", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log(`🔑 [Checkout] Token extracted, length: ${token.length}`)

    // Step 3: Verify Firebase token
    console.log(`🔑 [Checkout] Step 3: Verifying Firebase token...`)
    let decodedToken
    try {
      decodedToken = await verifyIdToken(token)
      console.log(`✅ [Checkout] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Checkout] Token verification failed:", tokenError)
      return new NextResponse(`Authentication failed: ${tokenError.message}`, { status: 401 })
    }

    const userId = decodedToken.uid
    const { id } = params

    // Step 4: Parse request body
    console.log(`📝 [Checkout] Step 4: Parsing request body...`)
    let body
    try {
      body = await req.json()
      console.log(`✅ [Checkout] Request body parsed:`, Object.keys(body))
    } catch (parseError) {
      console.error("❌ [Checkout] Failed to parse request body:", parseError)
      return new NextResponse(`Invalid request body: ${parseError.message}`, { status: 400 })
    }

    const { successUrl, cancelUrl } = body

    // Step 5: Get product box from Firestore
    console.log(`📦 [Checkout] Step 5: Fetching product box: ${id}`)
    let productBoxDoc
    try {
      productBoxDoc = await db.collection("productBoxes").doc(id).get()
      console.log(`✅ [Checkout] Product box query completed, exists: ${productBoxDoc.exists}`)
    } catch (firestoreError) {
      console.error("❌ [Checkout] Firestore query failed:", firestoreError)
      return new NextResponse(`Database error: ${firestoreError.message}`, { status: 500 })
    }

    if (!productBoxDoc.exists) {
      console.error(`❌ [Checkout] Product box not found: ${id}`)
      return new NextResponse("Product box not found", { status: 404 })
    }

    const productBox = productBoxDoc.data()
    if (!productBox) {
      console.error(`❌ [Checkout] Product box data is null: ${id}`)
      return new NextResponse("Product box data is invalid", { status: 400 })
    }

    console.log(`✅ [Checkout] Product box loaded:`, {
      title: productBox.title,
      price: productBox.price,
      active: productBox.active,
      creatorId: productBox.creatorId,
    })

    if (!productBox.active) {
      console.error(`❌ [Checkout] Product box is not active: ${id}`)
      return new NextResponse("Product box is not active", { status: 400 })
    }

    // Step 6: Get creator data
    console.log(`👤 [Checkout] Step 6: Fetching creator: ${productBox.creatorId}`)
    let creatorDoc
    try {
      creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
      console.log(`✅ [Checkout] Creator query completed, exists: ${creatorDoc.exists}`)
    } catch (creatorError) {
      console.error("❌ [Checkout] Creator query failed:", creatorError)
      return new NextResponse(`Creator lookup error: ${creatorError.message}`, { status: 500 })
    }

    if (!creatorDoc.exists) {
      console.error(`❌ [Checkout] Creator not found: ${productBox.creatorId}`)
      return new NextResponse("Creator not found", { status: 404 })
    }

    const creatorData = creatorDoc.data()
    if (!creatorData) {
      console.error(`❌ [Checkout] Creator data is null: ${productBox.creatorId}`)
      return new NextResponse("Creator data is invalid", { status: 400 })
    }

    console.log(`✅ [Checkout] Creator loaded:`, {
      username: creatorData.username,
      displayName: creatorData.displayName,
      hasStripeAccount: !!creatorData.stripeAccountId,
    })

    if (!creatorData.stripeAccountId) {
      console.error(`❌ [Checkout] Creator has no Stripe account: ${productBox.creatorId}`)
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    // Step 7: Calculate fees
    console.log(`💰 [Checkout] Step 7: Calculating fees...`)
    const applicationFee = Math.round(productBox.price * 0.25)
    console.log(
      `💰 [Checkout] Price: $${productBox.price / 100}, Platform fee: $${applicationFee / 100}, Creator gets: $${(productBox.price - applicationFee) / 100}`,
    )

    // Step 8: Validate environment variables
    console.log(`🔧 [Checkout] Step 8: Validating environment...`)
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ [Checkout] STRIPE_SECRET_KEY not configured")
      return new NextResponse("Payment system not configured", { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error("❌ [Checkout] NEXT_PUBLIC_SITE_URL not configured")
      return new NextResponse("Site URL not configured", { status: 500 })
    }

    console.log(`✅ [Checkout] Environment validated`)

    // Step 9: Create Stripe checkout session
    console.log(`🔄 [Checkout] Step 9: Creating Stripe session...`)
    let session
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: productBox.title,
                description:
                  productBox.description || `Product box by ${creatorData.username || creatorData.displayName}`,
              },
              unit_amount: productBox.price,
            },
            quantity: 1,
          },
        ],
        success_url:
          successUrl ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${id}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: creatorData.stripeAccountId,
          },
          metadata: {
            productBoxId: id,
            buyerUid: userId,
            creatorUid: productBox.creatorId,
            platformFeeAmount: applicationFee.toString(),
            creatorAmount: (productBox.price - applicationFee).toString(),
          },
        },
        metadata: {
          productBoxId: id,
          buyerUid: userId,
          creatorUid: productBox.creatorId,
          type: "product_box_purchase",
        },
      })

      console.log(`✅ [Checkout] Stripe session created: ${session.id}`)
    } catch (stripeError) {
      console.error("❌ [Checkout] Stripe session creation failed:", stripeError)
      return new NextResponse(`Payment processing error: ${stripeError.message}`, { status: 500 })
    }

    // Step 10: Return success response
    console.log(`🎉 [Checkout] Step 10: Returning success response`)
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("❌ [CHECKOUT] CRITICAL ERROR:", error)
    console.error("❌ [CHECKOUT] Error name:", error?.name)
    console.error("❌ [CHECKOUT] Error message:", error?.message)
    console.error("❌ [CHECKOUT] Error stack:", error?.stack)

    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    const errorName = error instanceof Error ? error.name : "UnknownError"

    return new NextResponse(`Checkout failed [${errorName}]: ${errorMessage}`, { status: 500 })
  }
}
