import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { productBoxId } = await request.json()

    console.log("🧪 [Test] Testing complete checkout flow for:", productBoxId)

    const testResults = {
      timestamp: new Date().toISOString(),
      productBoxId,
      steps: {} as any,
      summary: {
        passed: 0,
        failed: 0,
        issues: [] as string[],
      },
    }

    // Step 1: Fetch Product Box
    try {
      console.log("🧪 [Test] Step 1: Fetching product box...")
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

      if (!productBoxDoc.exists()) {
        throw new Error("Product box not found")
      }

      const productBox = productBoxDoc.data()
      testResults.steps.productBox = {
        success: true,
        data: {
          title: productBox?.title,
          price: productBox?.price,
          active: productBox?.active,
          priceId: productBox?.priceId,
          creatorId: productBox?.creatorId,
        },
      }
      testResults.summary.passed++
      console.log("✅ [Test] Step 1 passed")
    } catch (error) {
      testResults.steps.productBox = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
      testResults.summary.failed++
      testResults.summary.issues.push("Product box fetch failed")
      console.error("❌ [Test] Step 1 failed:", error)
    }

    // Step 2: Fetch Creator
    if (testResults.steps.productBox?.success) {
      try {
        console.log("🧪 [Test] Step 2: Fetching creator...")
        const creatorId = testResults.steps.productBox.data.creatorId
        const creatorDoc = await db.collection("users").doc(creatorId).get()

        if (!creatorDoc.exists()) {
          throw new Error("Creator not found")
        }

        const creatorData = creatorDoc.data()
        testResults.steps.creator = {
          success: true,
          data: {
            username: creatorData?.username,
            stripeAccountId: creatorData?.stripeAccountId,
            hasStripeAccount: !!creatorData?.stripeAccountId,
          },
        }
        testResults.summary.passed++
        console.log("✅ [Test] Step 2 passed")
      } catch (error) {
        testResults.steps.creator = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        testResults.summary.failed++
        testResults.summary.issues.push("Creator fetch failed")
        console.error("❌ [Test] Step 2 failed:", error)
      }
    }

    // Step 3: Validate Stripe Account
    if (testResults.steps.creator?.success && testResults.steps.creator.data.hasStripeAccount) {
      try {
        console.log("🧪 [Test] Step 3: Validating Stripe account...")
        const stripeAccountId = testResults.steps.creator.data.stripeAccountId
        const account = await stripe.accounts.retrieve(stripeAccountId)

        testResults.steps.stripeAccount = {
          success: true,
          data: {
            chargesEnabled: account.charges_enabled,
            detailsSubmitted: account.details_submitted,
            payoutsEnabled: account.payouts_enabled,
            country: account.country,
            type: account.type,
          },
        }
        testResults.summary.passed++
        console.log("✅ [Test] Step 3 passed")
      } catch (error) {
        testResults.steps.stripeAccount = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        testResults.summary.failed++
        testResults.summary.issues.push("Stripe account validation failed")
        console.error("❌ [Test] Step 3 failed:", error)
      }
    }

    // Step 4: Test Stripe Price
    if (testResults.steps.productBox?.success && testResults.steps.stripeAccount?.success) {
      try {
        console.log("🧪 [Test] Step 4: Testing Stripe price...")
        const priceId = testResults.steps.productBox.data.priceId
        const stripeAccountId = testResults.steps.creator.data.stripeAccountId

        const price = await stripe.prices.retrieve(priceId, {
          stripeAccount: stripeAccountId,
        })

        testResults.steps.stripePrice = {
          success: true,
          data: {
            id: price.id,
            active: price.active,
            currency: price.currency,
            unitAmount: price.unit_amount,
            type: price.type,
          },
        }
        testResults.summary.passed++
        console.log("✅ [Test] Step 4 passed")
      } catch (error) {
        testResults.steps.stripePrice = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        testResults.summary.failed++
        testResults.summary.issues.push("Stripe price validation failed")
        console.error("❌ [Test] Step 4 failed:", error)
      }
    }

    // Step 5: Test Session Creation (dry run)
    if (testResults.steps.stripePrice?.success) {
      try {
        console.log("🧪 [Test] Step 5: Testing session creation (dry run)...")
        const productBox = testResults.steps.productBox.data
        const stripeAccountId = testResults.steps.creator.data.stripeAccountId

        // Create a test session with a test success URL
        const sessionOptions: Stripe.Checkout.SessionCreateParams = {
          payment_method_types: ["card"],
          line_items: [
            {
              price: productBox.priceId,
              quantity: 1,
            },
          ],
          mode: productBox.type === "subscription" ? "subscription" : "payment",
          success_url: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "https://example.com/cancel",
          metadata: {
            productBoxId,
            test: "true",
          },
        }

        const session = await stripe.checkout.sessions.create(sessionOptions, {
          stripeAccount: stripeAccountId,
        })

        testResults.steps.sessionCreation = {
          success: true,
          data: {
            sessionId: session.id,
            url: session.url,
            mode: session.mode,
            status: session.status,
          },
        }
        testResults.summary.passed++
        console.log("✅ [Test] Step 5 passed - Session created:", session.id)

        // Clean up test session
        try {
          await stripe.checkout.sessions.expire(session.id, {
            stripeAccount: stripeAccountId,
          })
          console.log("🧹 [Test] Cleaned up test session")
        } catch (cleanupError) {
          console.warn("⚠️ [Test] Could not clean up test session:", cleanupError)
        }
      } catch (error) {
        testResults.steps.sessionCreation = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        testResults.summary.failed++
        testResults.summary.issues.push("Session creation failed")
        console.error("❌ [Test] Step 5 failed:", error)
      }
    }

    console.log("🧪 [Test] Complete checkout flow test results:", testResults.summary)

    return NextResponse.json({
      success: true,
      testResults,
    })
  } catch (error) {
    console.error("❌ [Test] Test flow error:", error)
    return NextResponse.json(
      {
        error: "Test flow failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
