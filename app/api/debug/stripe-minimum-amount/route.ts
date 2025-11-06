import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  console.log(`🔍 [Debug] === TESTING STRIPE MINIMUM AMOUNTS ===`)

  try {
    const { amount } = await req.json()

    console.log(`🔍 [Debug] Testing amount: $${amount / 100}`)

    const stripeLib = await import("@/lib/stripe")
    const stripe = stripeLib.stripe

    // Test different scenarios
    const results = {
      amount,
      amountInDollars: amount / 100,
      tests: {} as Record<string, any>,
    }

    // Test 1: Basic session creation
    console.log(`🔍 [Debug] Test 1: Basic session creation`)
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Test Product - $${amount / 100}`,
                description: "Testing minimum amount requirements",
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-cancel`,
        metadata: {
          debug: "true",
          testAmount: amount.toString(),
        },
      })

      results.tests.basicSession = {
        status: "success",
        sessionId: session.id,
        url: session.url,
      }
      console.log(`✅ [Debug] Basic session created: ${session.id}`)
    } catch (error) {
      results.tests.basicSession = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        type: (error as any)?.type,
        code: (error as any)?.code,
        param: (error as any)?.param,
      }
      console.error(`❌ [Debug] Basic session failed:`, error)
    }

    // Test 2: Check Stripe minimums
    console.log(`🔍 [Debug] Test 2: Checking Stripe minimums`)
    const stripeMinimums = {
      usd: 50, // $0.50 minimum for USD
      eur: 50, // €0.50 minimum for EUR
      gbp: 30, // £0.30 minimum for GBP
    }

    results.tests.minimumCheck = {
      amount,
      usdMinimum: stripeMinimums.usd,
      meetsMinimum: amount >= stripeMinimums.usd,
      difference: amount - stripeMinimums.usd,
    }

    if (amount < stripeMinimums.usd) {
      console.log(`⚠️ [Debug] Amount $${amount / 100} is below Stripe minimum of $${stripeMinimums.usd / 100}`)
    } else {
      console.log(`✅ [Debug] Amount $${amount / 100} meets Stripe minimum requirement`)
    }

    // Test 3: Try with application fee (if amount is high enough)
    if (amount >= 100) {
      // Only test with application fee if amount is $1.00 or more
      console.log(`🔍 [Debug] Test 3: Testing with application fee`)
      try {
        const applicationFee = Math.round(amount * 0.25)

        // We need a test connected account for this
        // For now, just test the calculation
        results.tests.applicationFeeTest = {
          status: "calculation_only",
          originalAmount: amount,
          applicationFee,
          creatorAmount: amount - applicationFee,
          feePercentage: 25,
          note: "Would need connected account to test actual session creation",
        }
        console.log(
          `✅ [Debug] Application fee calculation: Platform gets $${applicationFee / 100}, Creator gets $${(amount - applicationFee) / 100}`,
        )
      } catch (error) {
        results.tests.applicationFeeTest = {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }
        console.error(`❌ [Debug] Application fee test failed:`, error)
      }
    } else {
      results.tests.applicationFeeTest = {
        status: "skipped",
        reason: "Amount too low for application fee testing",
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error(`❌ [Debug] Test failed:`, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
