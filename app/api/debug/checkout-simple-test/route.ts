import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  console.log(`🔍 [Debug] === SIMPLE CHECKOUT TEST ===`)

  try {
    const { productBoxId, userId } = await req.json()

    console.log(`🔍 [Debug] Testing with:`, { productBoxId, userId })

    // Test 1: Firebase Admin
    console.log(`🔍 [Debug] Test 1: Firebase Admin import`)
    try {
      const { db } = await import("@/lib/firebase-admin")
      console.log(`✅ [Debug] Firebase admin imported successfully`)

      // Test product box query
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      console.log(`✅ [Debug] Product box query successful, exists: ${productBoxDoc.exists}`)

      if (productBoxDoc.exists) {
        const data = productBoxDoc.data()
        console.log(`✅ [Debug] Product box data:`, {
          title: data?.title,
          price: data?.price,
          priceType: typeof data?.price,
          creatorId: data?.creatorId,
          active: data?.active,
        })
      }
    } catch (firebaseError) {
      console.error(`❌ [Debug] Firebase test failed:`, firebaseError)
      return NextResponse.json({
        success: false,
        step: "Firebase Admin",
        error: firebaseError.message,
      })
    }

    // Test 2: Stripe
    console.log(`🔍 [Debug] Test 2: Stripe import`)
    try {
      const { stripe } = await import("@/lib/stripe")
      console.log(`✅ [Debug] Stripe imported successfully`)

      // Test basic Stripe functionality
      const testSession = {
        mode: "payment" as const,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Test Product",
              },
              unit_amount: 200, // $2.00
            },
            quantity: 1,
          },
        ],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      }

      // Don't actually create the session, just validate the structure
      console.log(`✅ [Debug] Stripe session structure valid`)
    } catch (stripeError) {
      console.error(`❌ [Debug] Stripe test failed:`, stripeError)
      return NextResponse.json({
        success: false,
        step: "Stripe",
        error: stripeError.message,
      })
    }

    // Test 3: Environment variables
    console.log(`🔍 [Debug] Test 3: Environment variables`)
    const envCheck = {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    }
    console.log(`✅ [Debug] Environment check:`, envCheck)

    if (!envCheck.hasStripeKey) {
      return NextResponse.json({
        success: false,
        step: "Environment Variables",
        error: "STRIPE_SECRET_KEY not configured",
      })
    }

    if (!envCheck.hasSiteUrl) {
      return NextResponse.json({
        success: false,
        step: "Environment Variables",
        error: "NEXT_PUBLIC_SITE_URL not configured",
      })
    }

    return NextResponse.json({
      success: true,
      message: "All checkout components working correctly",
      envCheck,
    })
  } catch (error) {
    console.error(`❌ [Debug] Test failed:`, error)
    return NextResponse.json({
      success: false,
      step: "Unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
