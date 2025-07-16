import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { bundleId, userId } = await request.json()

    console.log(`🔍 [Stripe Debug] Starting debug for bundle: ${bundleId}, user: ${userId}`)

    const debugResults = {
      success: false,
      bundleId,
      userId,
      timestamp: new Date().toISOString(),
      checks: {} as any,
      recommendations: [] as string[],
      bundle: null as any,
      creator: null as any,
      error: null as string | null,
      code: null as string | null,
    }

    // 1. Check if bundle exists
    try {
      const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (!bundleDoc.exists) {
        debugResults.error = "Bundle not found"
        debugResults.code = "BUNDLE_NOT_FOUND"
        debugResults.recommendations.push("Verify the bundle ID is correct")
        return NextResponse.json(debugResults)
      }

      debugResults.bundle = bundleDoc.data()
      debugResults.checks.bundleExists = true
      console.log(`✅ [Stripe Debug] Bundle found: ${debugResults.bundle.title}`)
    } catch (error) {
      debugResults.error = "Failed to fetch bundle"
      debugResults.code = "DATABASE_ERROR"
      debugResults.checks.bundleExists = false
      return NextResponse.json(debugResults)
    }

    // 2. Check if bundle is active and has valid pricing
    if (!debugResults.bundle.active) {
      debugResults.error = "Bundle is not active"
      debugResults.code = "BUNDLE_INACTIVE"
      debugResults.recommendations.push("Activate the bundle in creator dashboard")
      return NextResponse.json(debugResults)
    }

    if (!debugResults.bundle.price || debugResults.bundle.price <= 0) {
      debugResults.error = "Bundle has invalid pricing"
      debugResults.code = "INVALID_PRICE"
      debugResults.recommendations.push("Set a valid price for the bundle")
      return NextResponse.json(debugResults)
    }

    debugResults.checks.bundleActive = true
    debugResults.checks.validPrice = true

    // 3. Check creator exists and has Stripe setup
    try {
      const creatorDoc = await db.collection("users").doc(debugResults.bundle.creatorId).get()
      if (!creatorDoc.exists) {
        debugResults.error = "Creator not found"
        debugResults.code = "CREATOR_NOT_FOUND"
        return NextResponse.json(debugResults)
      }

      debugResults.creator = creatorDoc.data()
      debugResults.checks.creatorExists = true
      console.log(`✅ [Stripe Debug] Creator found: ${debugResults.creator.username}`)
    } catch (error) {
      debugResults.error = "Failed to fetch creator"
      debugResults.code = "DATABASE_ERROR"
      debugResults.checks.creatorExists = false
      return NextResponse.json(debugResults)
    }

    // 4. Check Stripe account setup
    if (!debugResults.creator.stripeAccountId) {
      debugResults.error = "Creator has no Stripe account"
      debugResults.code = "NO_STRIPE_ACCOUNT"
      debugResults.recommendations.push("Creator needs to complete Stripe Connect onboarding")
      debugResults.recommendations.push("Check /dashboard/connect-stripe page")
      return NextResponse.json(debugResults)
    }

    debugResults.checks.hasStripeAccount = true

    // 5. Verify Stripe account is accessible and ready
    try {
      const account = await stripe.accounts.retrieve(debugResults.creator.stripeAccountId)

      debugResults.checks.stripeAccountAccessible = true
      debugResults.checks.chargesEnabled = account.charges_enabled
      debugResults.checks.detailsSubmitted = account.details_submitted
      debugResults.checks.requirementsCount = account.requirements?.currently_due?.length || 0

      console.log(`✅ [Stripe Debug] Stripe account status:`, {
        id: account.id,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements?.currently_due?.length || 0,
      })

      if (!account.charges_enabled) {
        debugResults.error = "Creator has not completed Stripe setup"
        debugResults.code = "NO_STRIPE_ACCOUNT"
        debugResults.recommendations.push("Creator needs to complete Stripe Connect onboarding")
        debugResults.recommendations.push("Check /dashboard/connect-stripe page")
        debugResults.recommendations.push("Verify Stripe webhook configuration")
        return NextResponse.json(debugResults)
      }

      if (!account.details_submitted) {
        debugResults.error = "Creator has not submitted required details"
        debugResults.code = "INCOMPLETE_STRIPE_SETUP"
        debugResults.recommendations.push("Creator needs to complete business details")
        return NextResponse.json(debugResults)
      }

      if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
        debugResults.error = "Creator has pending Stripe requirements"
        debugResults.code = "STRIPE_REQUIREMENTS_PENDING"
        debugResults.recommendations.push(`Pending requirements: ${account.requirements.currently_due.join(", ")}`)
        return NextResponse.json(debugResults)
      }
    } catch (error: any) {
      debugResults.error = "Failed to verify Stripe account"
      debugResults.code = "STRIPE_API_ERROR"
      debugResults.checks.stripeAccountAccessible = false
      debugResults.recommendations.push("Check Stripe API keys configuration")
      debugResults.recommendations.push("Verify connected account permissions")
      console.error(`❌ [Stripe Debug] Stripe API error:`, error.message)
      return NextResponse.json(debugResults)
    }

    // 6. Test creating a checkout session (dry run)
    try {
      const testSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: debugResults.bundle.currency || "usd",
              product_data: {
                name: debugResults.bundle.title,
                description: debugResults.bundle.description || "",
              },
              unit_amount: Math.round(debugResults.bundle.price * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${debugResults.creator.username}`,
        metadata: {
          productBoxId: bundleId,
          creatorId: debugResults.bundle.creatorId,
          userId: userId,
          testMode: "true",
        },
        payment_intent_data: {
          application_fee_amount: Math.round(debugResults.bundle.price * 100 * 0.1), // 10% platform fee
          transfer_data: {
            destination: debugResults.creator.stripeAccountId,
          },
        },
        expires_at: Math.floor(Date.now() / 1000) + 60, // Expire in 1 minute
      })

      debugResults.checks.checkoutSessionCreated = true
      debugResults.checks.testSessionId = testSession.id
      console.log(`✅ [Stripe Debug] Test checkout session created: ${testSession.id}`)

      // Immediately expire the test session
      await stripe.checkout.sessions.expire(testSession.id)
      debugResults.checks.testSessionExpired = true
    } catch (error: any) {
      debugResults.error = "Failed to create test checkout session"
      debugResults.code = "CHECKOUT_CREATION_FAILED"
      debugResults.checks.checkoutSessionCreated = false
      debugResults.recommendations.push("Check Stripe Connect configuration")
      debugResults.recommendations.push("Verify platform fee settings")
      console.error(`❌ [Stripe Debug] Checkout creation error:`, error.message)
      return NextResponse.json(debugResults)
    }

    // All checks passed!
    debugResults.success = true
    debugResults.recommendations.push("All checks passed - checkout should work!")
    console.log(`✅ [Stripe Debug] All checks passed for bundle: ${bundleId}`)

    return NextResponse.json(debugResults)
  } catch (error: any) {
    console.error(`❌ [Stripe Debug] Unexpected error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error during debug",
        code: "INTERNAL_ERROR",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
