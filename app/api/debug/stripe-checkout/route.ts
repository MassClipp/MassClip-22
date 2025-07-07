import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { bundleId } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required", code: "MISSING_BUNDLE_ID" }, { status: 400 })
    }

    const logs: string[] = []
    const recommendations: string[] = []

    logs.push(`🔍 Starting debug for bundle: ${bundleId}`)

    // Check if bundle exists in productBoxes or bundles collection
    let bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    let collection = "productBoxes"

    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("bundles").doc(bundleId).get()
      collection = "bundles"
    }

    if (!bundleDoc.exists) {
      logs.push(`❌ Bundle not found in either collection`)
      return NextResponse.json({
        success: false,
        error: "Bundle not found",
        code: "BUNDLE_NOT_FOUND",
        logs,
        recommendations: ["Check if the bundle ID is correct", "Verify bundle exists in Firestore"],
      })
    }

    const bundleData = bundleDoc.data()
    logs.push(`✅ Bundle found in ${collection} collection`)
    logs.push(`📦 Bundle: ${bundleData?.title} - $${bundleData?.price} ${bundleData?.currency || "usd"}`)

    // Get creator data
    const creatorDoc = await db.collection("users").doc(bundleData?.creatorId).get()
    if (!creatorDoc.exists) {
      logs.push(`❌ Creator not found: ${bundleData?.creatorId}`)
      return NextResponse.json({
        success: false,
        error: "Creator not found",
        code: "CREATOR_NOT_FOUND",
        logs,
        bundle: bundleData,
      })
    }

    const creatorData = creatorDoc.data()
    logs.push(`✅ Creator found: ${creatorData?.username}`)
    logs.push(`🏦 Stripe Account ID: ${creatorData?.stripeAccountId || "None"}`)
    logs.push(`✅ Onboarding Complete: ${creatorData?.stripeOnboardingComplete || false}`)

    // Check Stripe configuration
    const stripeConfig = {
      environment: process.env.NODE_ENV,
      hasMainKey: !!process.env.STRIPE_SECRET_KEY,
      hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
      keyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
    }

    // Test Stripe account access if account exists
    let stripeAccountStatus = null
    if (creatorData?.stripeAccountId) {
      try {
        logs.push(`🔍 Testing Stripe account access...`)
        const account = await stripe.accounts.retrieve(creatorData.stripeAccountId)

        stripeAccountStatus = {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            eventually_due: account.requirements?.eventually_due || [],
            past_due: account.requirements?.past_due || [],
            pending_verification: account.requirements?.pending_verification || [],
          },
        }

        logs.push(`✅ Stripe account accessible`)
        logs.push(`💳 Charges enabled: ${account.charges_enabled}`)
        logs.push(`💰 Payouts enabled: ${account.payouts_enabled}`)
        logs.push(`📋 Details submitted: ${account.details_submitted}`)

        // Check if account can actually accept payments
        const canAcceptPayments = account.charges_enabled && account.details_submitted
        logs.push(`🎯 Can accept payments: ${canAcceptPayments}`)

        if (!canAcceptPayments) {
          if (account.requirements?.currently_due?.length > 0) {
            recommendations.push(`Creator has ${account.requirements.currently_due.length} requirements currently due`)
            recommendations.push("Creator needs to complete Stripe Connect onboarding")
          }
          if (account.requirements?.past_due?.length > 0) {
            recommendations.push(`Creator has ${account.requirements.past_due.length} past due requirements`)
          }
        }
      } catch (stripeError: any) {
        logs.push(`❌ Stripe account access failed: ${stripeError.message}`)
        stripeAccountStatus = { error: stripeError.message }
        recommendations.push("Stripe account may be invalid or inaccessible")
      }
    }

    // Determine overall success
    const hasStripeAccount = !!creatorData?.stripeAccountId
    const onboardingComplete = creatorData?.stripeOnboardingComplete === true
    const stripeAccountWorking = stripeAccountStatus && !stripeAccountStatus.error && stripeAccountStatus.chargesEnabled

    // Fix the logic here - if Stripe account is working, consider it complete
    const actuallyComplete = hasStripeAccount && (onboardingComplete || stripeAccountWorking)

    logs.push(`🔍 Logic check:`)
    logs.push(`  - Has Stripe Account: ${hasStripeAccount}`)
    logs.push(`  - Onboarding Complete (DB): ${onboardingComplete}`)
    logs.push(`  - Stripe Account Working: ${stripeAccountWorking}`)
    logs.push(`  - Actually Complete: ${actuallyComplete}`)

    if (!actuallyComplete) {
      if (!hasStripeAccount) {
        recommendations.push("Creator needs to connect their Stripe account")
        recommendations.push("Check /dashboard/connect-stripe page")
      } else if (!stripeAccountWorking) {
        recommendations.push("Creator needs to complete Stripe Connect onboarding")
        recommendations.push("Check /dashboard/connect-stripe page")
        recommendations.push("Verify Stripe webhook configuration")
      }
    }

    // Test creating a checkout session (dry run)
    let checkoutTest = null
    if (actuallyComplete && bundleData?.price > 0) {
      try {
        logs.push(`🧪 Testing checkout session creation...`)

        const priceInCents = Math.round(bundleData.price * 100)
        const platformFeeAmount = Math.round(priceInCents * 0.05)

        // Create a test session that expires immediately
        const testSession = await stripe.checkout.sessions.create(
          {
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: bundleData.currency || "usd",
                  product_data: {
                    name: `TEST: ${bundleData.title}`,
                    description: "Test checkout session - will expire immediately",
                  },
                  unit_amount: priceInCents,
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: "https://example.com/success",
            cancel_url: "https://example.com/cancel",
            expires_at: Math.floor(Date.now() / 1000) + 60, // Expire in 1 minute
            metadata: {
              test: "true",
              bundleId: bundleId,
            },
            payment_intent_data: {
              application_fee_amount: platformFeeAmount,
            },
          },
          {
            stripeAccount: creatorData.stripeAccountId,
          },
        )

        checkoutTest = {
          success: true,
          sessionId: testSession.id,
          url: testSession.url,
        }

        logs.push(`✅ Test checkout session created successfully`)
        logs.push(`🔗 Session ID: ${testSession.id}`)

        // Immediately expire the test session
        await stripe.checkout.sessions.expire(testSession.id, {
          stripeAccount: creatorData.stripeAccountId,
        })
        logs.push(`🗑️ Test session expired`)
      } catch (checkoutError: any) {
        logs.push(`❌ Checkout test failed: ${checkoutError.message}`)
        checkoutTest = {
          success: false,
          error: checkoutError.message,
          code: checkoutError.code,
          type: checkoutError.type,
        }

        if (checkoutError.code === "account_invalid") {
          recommendations.push("Creator's Stripe account is invalid or restricted")
        } else if (checkoutError.code === "amount_too_small") {
          recommendations.push(`Minimum charge amount not met for ${bundleData.currency || "USD"}`)
        }
      }
    }

    return NextResponse.json({
      success: actuallyComplete,
      bundleId,
      userId: "debug-user",
      timestamp: new Date().toISOString(),
      bundle: {
        id: bundleId,
        title: bundleData?.title,
        description: bundleData?.description,
        price: bundleData?.price,
        currency: bundleData?.currency || "usd",
        active: bundleData?.active,
        creatorId: bundleData?.creatorId,
        collection,
      },
      creator: {
        id: bundleData?.creatorId,
        username: creatorData?.username,
        email: creatorData?.email,
        hasStripeAccount,
        stripeAccountId: creatorData?.stripeAccountId,
        onboardingComplete: creatorData?.stripeOnboardingComplete,
        actuallyComplete,
      },
      stripeConfig,
      stripeAccountStatus,
      checkoutTest,
      logs,
      recommendations,
      error: actuallyComplete ? undefined : "Creator has not completed Stripe setup",
      code: actuallyComplete ? undefined : "NO_STRIPE_ACCOUNT",
    })
  } catch (error: any) {
    console.error("Debug error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Debug failed",
        code: "DEBUG_ERROR",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
