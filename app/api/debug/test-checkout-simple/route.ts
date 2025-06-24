import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  console.log(`🧪 [Test Checkout] Starting simple checkout test...`)

  try {
    // Test 1: Basic imports
    console.log(`📦 [Test] Step 1: Testing imports...`)

    let db, verifyIdToken, stripe

    try {
      const firebaseAdmin = await import("@/lib/firebase-admin")
      db = firebaseAdmin.db
      verifyIdToken = firebaseAdmin.verifyIdToken
      console.log(`✅ [Test] Firebase Admin imported successfully`)
    } catch (error) {
      console.error(`❌ [Test] Firebase import failed:`, error)
      return NextResponse.json({
        success: false,
        step: "firebase_import",
        error: error.message,
      })
    }

    try {
      const stripeLib = await import("@/lib/stripe")
      stripe = stripeLib.stripe
      console.log(`✅ [Test] Stripe imported successfully`)
    } catch (error) {
      console.error(`❌ [Test] Stripe import failed:`, error)
      return NextResponse.json({
        success: false,
        step: "stripe_import",
        error: error.message,
      })
    }

    // Test 2: Environment variables
    console.log(`🔧 [Test] Step 2: Testing environment variables...`)

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        step: "env_check",
        error: "STRIPE_SECRET_KEY not found",
      })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json({
        success: false,
        step: "env_check",
        error: "NEXT_PUBLIC_SITE_URL not found",
      })
    }

    console.log(`✅ [Test] Environment variables OK`)

    // Test 3: Parse request body
    console.log(`📝 [Test] Step 3: Testing request parsing...`)

    let body
    try {
      body = await req.json()
      console.log(`✅ [Test] Request body parsed:`, Object.keys(body))
    } catch (error) {
      return NextResponse.json({
        success: false,
        step: "request_parsing",
        error: error.message,
      })
    }

    const { idToken, productBoxId } = body

    if (!idToken) {
      return NextResponse.json({
        success: false,
        step: "token_validation",
        error: "No idToken provided",
      })
    }

    if (!productBoxId) {
      return NextResponse.json({
        success: false,
        step: "product_validation",
        error: "No productBoxId provided",
      })
    }

    // Test 4: Token verification
    console.log(`🔑 [Test] Step 4: Testing token verification...`)

    let decodedToken
    try {
      decodedToken = await verifyIdToken(idToken)
      console.log(`✅ [Test] Token verified for user: ${decodedToken.uid}`)
    } catch (error) {
      return NextResponse.json({
        success: false,
        step: "token_verification",
        error: error.message,
      })
    }

    // Test 5: Firestore connection
    console.log(`🔥 [Test] Step 5: Testing Firestore connection...`)

    let productBoxDoc
    try {
      productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      console.log(`✅ [Test] Firestore query completed, exists: ${productBoxDoc.exists}`)
    } catch (error) {
      return NextResponse.json({
        success: false,
        step: "firestore_connection",
        error: error.message,
      })
    }

    if (!productBoxDoc.exists) {
      return NextResponse.json({
        success: false,
        step: "product_lookup",
        error: "Product box not found",
      })
    }

    const productBox = productBoxDoc.data()
    console.log(`✅ [Test] Product box loaded: ${productBox?.title}`)

    // Test 6: Creator lookup
    console.log(`👤 [Test] Step 6: Testing creator lookup...`)

    let creatorDoc
    try {
      creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
      console.log(`✅ [Test] Creator query completed, exists: ${creatorDoc.exists}`)
    } catch (error) {
      return NextResponse.json({
        success: false,
        step: "creator_lookup",
        error: error.message,
      })
    }

    if (!creatorDoc.exists) {
      return NextResponse.json({
        success: false,
        step: "creator_validation",
        error: "Creator not found",
      })
    }

    const creatorData = creatorDoc.data()
    console.log(`✅ [Test] Creator loaded: ${creatorData?.username}`)

    if (!creatorData?.stripeAccountId) {
      return NextResponse.json({
        success: false,
        step: "stripe_account_check",
        error: "Creator has no Stripe account",
      })
    }

    // Test 7: Simple Stripe session creation
    console.log(`💳 [Test] Step 7: Testing Stripe session creation...`)

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Test - ${productBox.title}`,
                description: "Test checkout session",
              },
              unit_amount: productBox.price,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/test-success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/test-cancel`,
        metadata: {
          test: "true",
          productBoxId: productBoxId,
          buyerUid: decodedToken.uid,
        },
      })

      console.log(`✅ [Test] Stripe session created: ${session.id}`)

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        message: "All tests passed successfully!",
      })
    } catch (stripeError) {
      console.error(`❌ [Test] Stripe session creation failed:`, stripeError)
      return NextResponse.json({
        success: false,
        step: "stripe_session_creation",
        error: stripeError.message,
        stripeErrorType: stripeError.type,
        stripeErrorCode: stripeError.code,
      })
    }
  } catch (error) {
    console.error(`❌ [Test] Critical error:`, error)
    return NextResponse.json({
      success: false,
      step: "critical_error",
      error: error.message,
      stack: error.stack,
    })
  }
}
