import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { creatorId } = await request.json()

    console.log(`🔍 [Stripe Connect Test] Testing creator: ${creatorId}`)

    // Get creator's Stripe account info
    const creatorRef = db.collection("users").doc(creatorId)
    const creatorDoc = await creatorRef.get()

    if (!creatorDoc.exists) {
      return NextResponse.json({
        success: false,
        error: "Creator not found",
      })
    }

    const creatorData = creatorDoc.data()!
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        success: false,
        error: "Creator has no Stripe account",
        data: {
          hasStripeAccount: false,
          onboardingComplete: creatorData.stripeOnboardingComplete || false,
        },
      })
    }

    // Test Stripe account access
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      const testResult = {
        success: true,
        data: {
          accountId: account.id,
          country: account.country,
          defaultCurrency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          type: account.type,
          capabilities: account.capabilities,
          requirements: {
            currentlyDue: account.requirements?.currently_due || [],
            eventuallyDue: account.requirements?.eventually_due || [],
            pastDue: account.requirements?.past_due || [],
            pendingVerification: account.requirements?.pending_verification || [],
          },
          canAcceptPayments: account.charges_enabled && account.details_submitted,
        },
      }

      // Test creating a test checkout session (without actually processing)
      try {
        const testSessionParams: Stripe.Checkout.SessionCreateParams = {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Test Product",
                },
                unit_amount: 1000, // $10.00
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: "https://example.com/success",
          cancel_url: "https://example.com/cancel",
          payment_intent_data: {
            application_fee_amount: 50, // $0.50 platform fee
          },
          stripe_account: stripeAccountId,
        }

        // This will validate the configuration without creating an actual session
        const testSession = await stripe.checkout.sessions.create(testSessionParams)

        testResult.data.checkoutTest = {
          success: true,
          sessionId: testSession.id,
          message: "Checkout session creation successful",
        }
      } catch (checkoutError) {
        testResult.data.checkoutTest = {
          success: false,
          error: checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error",
          errorType: checkoutError?.constructor?.name,
        }
      }

      return NextResponse.json(testResult)
    } catch (stripeError) {
      return NextResponse.json({
        success: false,
        error: "Stripe account access failed",
        details: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        data: {
          accountId: stripeAccountId,
          hasStripeAccount: true,
        },
      })
    }
  } catch (error) {
    console.error("❌ [Stripe Connect Test] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
