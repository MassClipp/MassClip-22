import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  console.log(`🔍 [Debug] === TESTING CHECKOUT COMPONENTS ===`)

  const results = {
    timestamp: new Date().toISOString(),
    tests: {} as Record<string, any>,
  }

  // Test 1: Environment Variables
  console.log(`🔍 [Debug] Test 1: Environment Variables`)
  try {
    results.tests.environment = {
      status: "success",
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    }
    console.log(`✅ [Debug] Environment check passed`)
  } catch (error) {
    results.tests.environment = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
    console.error(`❌ [Debug] Environment check failed:`, error)
  }

  // Test 2: Firebase Admin Import
  console.log(`🔍 [Debug] Test 2: Firebase Admin Import`)
  try {
    const firebaseAdmin = await import("@/lib/firebase-admin")
    results.tests.firebaseAdmin = {
      status: "success",
      hasDb: !!firebaseAdmin.db,
      hasVerifyIdToken: !!firebaseAdmin.verifyIdToken,
      hasAuth: !!firebaseAdmin.auth,
    }
    console.log(`✅ [Debug] Firebase Admin import passed`)
  } catch (error) {
    results.tests.firebaseAdmin = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
    console.error(`❌ [Debug] Firebase Admin import failed:`, error)
  }

  // Test 3: Stripe Import
  console.log(`🔍 [Debug] Test 3: Stripe Import`)
  try {
    const stripeLib = await import("@/lib/stripe")
    results.tests.stripe = {
      status: "success",
      hasStripe: !!stripeLib.stripe,
      stripeConstructor: typeof stripeLib.stripe,
    }
    console.log(`✅ [Debug] Stripe import passed`)
  } catch (error) {
    results.tests.stripe = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
    console.error(`❌ [Debug] Stripe import failed:`, error)
  }

  // Test 4: Stripe API Test
  console.log(`🔍 [Debug] Test 4: Stripe API Test`)
  try {
    const stripeLib = await import("@/lib/stripe")
    const stripe = stripeLib.stripe

    // Simple API call to test Stripe connection
    const account = await stripe.accounts.retrieve()
    results.tests.stripeApi = {
      status: "success",
      accountId: account.id,
      accountType: account.type,
    }
    console.log(`✅ [Debug] Stripe API test passed`)
  } catch (error) {
    results.tests.stripeApi = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      type: (error as any)?.type,
      code: (error as any)?.code,
    }
    console.error(`❌ [Debug] Stripe API test failed:`, error)
  }

  // Test 5: Firebase Connection Test
  console.log(`🔍 [Debug] Test 5: Firebase Connection Test`)
  try {
    const firebaseAdmin = await import("@/lib/firebase-admin")
    const db = firebaseAdmin.db

    // Simple query to test Firebase connection
    const testDoc = await db.collection("users").limit(1).get()
    results.tests.firebaseConnection = {
      status: "success",
      hasResults: !testDoc.empty,
      resultCount: testDoc.size,
    }
    console.log(`✅ [Debug] Firebase connection test passed`)
  } catch (error) {
    results.tests.firebaseConnection = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      code: (error as any)?.code,
    }
    console.error(`❌ [Debug] Firebase connection test failed:`, error)
  }

  // Test 6: Sample Product Box Query
  console.log(`🔍 [Debug] Test 6: Sample Product Box Query`)
  try {
    const firebaseAdmin = await import("@/lib/firebase-admin")
    const db = firebaseAdmin.db

    const productBoxes = await db.collection("productBoxes").limit(1).get()
    results.tests.productBoxQuery = {
      status: "success",
      hasResults: !productBoxes.empty,
      resultCount: productBoxes.size,
      sampleData: productBoxes.empty
        ? null
        : {
            id: productBoxes.docs[0].id,
            hasTitle: !!productBoxes.docs[0].data().title,
            hasPrice: !!productBoxes.docs[0].data().price,
            hasCreatorId: !!productBoxes.docs[0].data().creatorId,
          },
    }
    console.log(`✅ [Debug] Product box query test passed`)
  } catch (error) {
    results.tests.productBoxQuery = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
    console.error(`❌ [Debug] Product box query test failed:`, error)
  }

  console.log(`🔍 [Debug] === COMPONENT TESTS COMPLETE ===`)

  return NextResponse.json(results, { status: 200 })
}

export async function POST(req: NextRequest) {
  console.log(`🔍 [Debug] === TESTING CHECKOUT SESSION CREATION ===`)

  try {
    const body = await req.json()
    const { productBoxId } = body

    if (!productBoxId) {
      return NextResponse.json({ error: "productBoxId required" }, { status: 400 })
    }

    console.log(`🔍 [Debug] Testing checkout for product box: ${productBoxId}`)

    // Import dependencies
    const firebaseAdmin = await import("@/lib/firebase-admin")
    const stripeLib = await import("@/lib/stripe")
    const db = firebaseAdmin.db
    const stripe = stripeLib.stripe

    // Get product box
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    console.log(`🔍 [Debug] Product box data:`, {
      title: productBox.title,
      price: productBox.price,
      creatorId: productBox.creatorId,
    })

    // Create a test checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title || "Test Product",
              description: "Debug test checkout",
            },
            unit_amount: productBox.price || 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-cancel`,
      metadata: {
        debug: "true",
        productBoxId,
      },
    })

    console.log(`✅ [Debug] Test checkout session created: ${session.id}`)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      productBox: {
        title: productBox.title,
        price: productBox.price,
      },
    })
  } catch (error) {
    console.error(`❌ [Debug] Test checkout failed:`, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        type: (error as any)?.type,
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
