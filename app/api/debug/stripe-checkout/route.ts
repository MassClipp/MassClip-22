import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Stripe Checkout Debug] Starting debug session`)

    const logs: string[] = []
    logs.push("🔍 Starting Stripe checkout debug session")

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          code: "INVALID_REQUEST_BODY",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const { bundleId } = body

    if (!bundleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bundle ID is required",
          code: "MISSING_BUNDLE_ID",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    logs.push(`🔍 Debugging bundle: ${bundleId}`)

    const debugResult: any = {
      success: false,
      bundleId,
      timestamp: new Date().toISOString(),
      recommendations: [],
      logs,
    }

    // Step 1: Check Stripe configuration
    logs.push("🔧 Checking Stripe configuration...")

    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST
    const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
    const isProduction = vercelEnv === "production"

    debugResult.stripeConfig = {
      hasMainKey: !!stripeKey,
      hasTestKey: !!stripeTestKey,
      environment: vercelEnv,
      isProduction,
      keyType: stripeKey?.startsWith("sk_live_") ? "live" : stripeKey?.startsWith("sk_test_") ? "test" : "unknown",
    }

    if (!stripeKey && !stripeTestKey) {
      debugResult.error = "No Stripe keys configured"
      debugResult.code = "STRIPE_CONFIG_ERROR"
      debugResult.recommendations.push("Add STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST environment variable")
      logs.push("❌ No Stripe keys found")
      return NextResponse.json(debugResult, { status: 500 })
    }

    logs.push(`✅ Stripe configured: ${debugResult.stripeConfig.keyType} mode`)

    // Step 2: Test Stripe connection
    try {
      logs.push("🔗 Testing Stripe connection...")
      const account = await stripe.accounts.retrieve()
      logs.push(`✅ Stripe connection successful: ${account.id}`)
    } catch (stripeError: any) {
      debugResult.error = `Stripe connection failed: ${stripeError.message}`
      debugResult.code = "STRIPE_CONNECTION_ERROR"
      debugResult.recommendations.push("Check Stripe API key validity")
      debugResult.recommendations.push("Verify network connectivity")
      logs.push(`❌ Stripe connection failed: ${stripeError.message}`)
      return NextResponse.json(debugResult, { status: 500 })
    }

    // Step 3: Check if bundle exists
    logs.push("📦 Checking bundle existence...")
    let bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    let collection = "productBoxes"

    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("bundles").doc(bundleId).get()
      collection = "bundles"
    }

    if (!bundleDoc.exists) {
      debugResult.error = "Bundle not found in database"
      debugResult.code = "BUNDLE_NOT_FOUND"
      debugResult.recommendations.push("Verify the bundle ID is correct")
      debugResult.recommendations.push("Check if the bundle was deleted")
      debugResult.recommendations.push("Use the Bundle Finder tool to see all available bundles")
      logs.push(`❌ Bundle not found in either collection`)
      return NextResponse.json(debugResult, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    debugResult.bundle = {
      id: bundleId,
      title: bundleData?.title,
      description: bundleData?.description,
      price: bundleData?.price,
      currency: bundleData?.currency || "usd",
      active: bundleData?.active,
      creatorId: bundleData?.creatorId,
      collection,
    }

    logs.push(`✅ Bundle found in ${collection}: ${bundleData?.title}`)

    // Step 4: Validate bundle data
    if (!bundleData?.active) {
      debugResult.error = "Bundle is inactive and cannot be purchased"
      debugResult.code = "BUNDLE_INACTIVE"
      debugResult.recommendations.push("Enable the bundle in the creator dashboard")
      debugResult.recommendations.push("Check if the bundle has content added")
      logs.push(`❌ Bundle is inactive`)
      return NextResponse.json(debugResult, { status: 400 })
    }

    if (!bundleData?.price || bundleData.price <= 0) {
      debugResult.error = "Bundle has invalid pricing"
      debugResult.code = "INVALID_PRICE"
      debugResult.recommendations.push("Set a valid price greater than $0")
      debugResult.recommendations.push("Check currency settings")
      logs.push(`❌ Invalid bundle price: ${bundleData?.price}`)
      return NextResponse.json(debugResult, { status: 400 })
    }

    logs.push(`✅ Bundle validation passed: $${bundleData.price} ${bundleData.currency || "USD"}`)

    // Step 5: Check creator
    if (!bundleData?.creatorId) {
      debugResult.error = "Bundle has no creator assigned"
      debugResult.code = "NO_CREATOR"
      debugResult.recommendations.push("Assign a creator to this bundle")
      logs.push(`❌ No creator assigned to bundle`)
      return NextResponse.json(debugResult, { status: 400 })
    }

    logs.push(`🔍 Checking creator: ${bundleData.creatorId}`)

    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      debugResult.error = "Creator not found in database"
      debugResult.code = "CREATOR_NOT_FOUND"
      debugResult.recommendations.push("Verify the creator ID is correct")
      debugResult.recommendations.push("Check if the creator account was deleted")
      logs.push(`❌ Creator not found`)
      return NextResponse.json(debugResult, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    debugResult.creator = {
      id: bundleData.creatorId,
      username: creatorData?.username,
      email: creatorData?.email,
      hasStripeAccount: !!creatorData?.stripeAccountId,
      stripeAccountId: creatorData?.stripeAccountId,
      onboardingComplete: creatorData?.stripeOnboardingComplete,
    }

    logs.push(`✅ Creator found: ${creatorData?.username}`)

    // Step 6: Check Stripe integration
    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboardingComplete) {
      debugResult.error = "Creator has not completed Stripe setup"
      debugResult.code = "NO_STRIPE_ACCOUNT"
      debugResult.recommendations.push("Creator needs to complete Stripe Connect onboarding")
      debugResult.recommendations.push("Check /dashboard/connect-stripe page")
      debugResult.recommendations.push("Verify Stripe webhook configuration")
      logs.push(`❌ Creator Stripe setup incomplete`)
      return NextResponse.json(debugResult, { status: 400 })
    }

    logs.push(`✅ Creator Stripe setup complete: ${creatorData.stripeAccountId}`)

    // Step 7: Test Stripe account access
    try {
      logs.push("🔗 Testing creator's Stripe account...")
      const connectedAccount = await stripe.accounts.retrieve(creatorData.stripeAccountId)
      logs.push(`✅ Connected account accessible: ${connectedAccount.id}`)

      // Check account capabilities
      if (!connectedAccount.charges_enabled) {
        debugResult.error = "Creator's Stripe account cannot accept charges"
        debugResult.code = "STRIPE_CHARGES_DISABLED"
        debugResult.recommendations.push("Creator needs to complete Stripe account verification")
        debugResult.recommendations.push("Check Stripe dashboard for account restrictions")
        logs.push(`❌ Charges disabled on connected account`)
        return NextResponse.json(debugResult, { status: 400 })
      }

      if (!connectedAccount.payouts_enabled) {
        logs.push(`⚠️ Payouts disabled on connected account (charges still work)`)
        debugResult.recommendations.push("Creator should complete payout setup for full functionality")
      }
    } catch (stripeAccountError: any) {
      debugResult.error = `Cannot access creator's Stripe account: ${stripeAccountError.message}`
      debugResult.code = "STRIPE_ACCOUNT_ERROR"
      debugResult.recommendations.push("Creator may need to re-connect their Stripe account")
      debugResult.recommendations.push("Check if the Stripe account ID is valid")
      logs.push(`❌ Stripe account error: ${stripeAccountError.message}`)
      return NextResponse.json(debugResult, { status: 400 })
    }

    // Step 8: Test checkout session creation (dry run)
    try {
      logs.push("🧪 Testing checkout session creation...")

      const priceInCents = Math.round(bundleData.price * 100)
      const platformFeeAmount = Math.round(priceInCents * 0.05) // 5% platform fee

      // Create a test session (but don't return the URL)
      const testSessionParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: bundleData.currency || "usd",
              product_data: {
                name: bundleData.title,
                description: `Test checkout for ${bundleData.title}`,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment" as const,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
        metadata: {
          productBoxId: bundleId,
          creatorUid: bundleData.creatorId,
          test: "true",
        },
        payment_intent_data: {
          application_fee_amount: platformFeeAmount,
          metadata: {
            productBoxId: bundleId,
            creatorUid: bundleData.creatorId,
            test: "true",
          },
        },
      }

      // Test session creation on connected account
      const testSession = await stripe.checkout.sessions.create(testSessionParams, {
        stripeAccount: creatorData.stripeAccountId,
      })

      logs.push(`✅ Test checkout session created: ${testSession.id}`)

      // Immediately expire the test session to avoid confusion
      try {
        await stripe.checkout.sessions.expire(testSession.id, {
          stripeAccount: creatorData.stripeAccountId,
        })
        logs.push(`✅ Test session expired successfully`)
      } catch (expireError) {
        logs.push(`⚠️ Could not expire test session (not critical)`)
      }
    } catch (checkoutError: any) {
      debugResult.error = `Checkout session creation failed: ${checkoutError.message}`
      debugResult.code = "CHECKOUT_CREATION_FAILED"
      debugResult.recommendations.push("Check Stripe account permissions")
      debugResult.recommendations.push("Verify application fee settings")
      debugResult.recommendations.push("Check minimum charge amounts for currency")
      logs.push(`❌ Checkout creation failed: ${checkoutError.message}`)
      return NextResponse.json(debugResult, { status: 500 })
    }

    // Step 9: All checks passed
    debugResult.success = true
    debugResult.error = null
    debugResult.recommendations.push("All checks passed - checkout should work")
    debugResult.recommendations.push("If still failing, check browser console for client-side errors")
    debugResult.recommendations.push("Verify webhook endpoints are configured correctly")

    logs.push(`✅ All checks passed for bundle: ${bundleId}`)
    debugResult.logs = logs

    return NextResponse.json(debugResult)
  } catch (error: any) {
    console.error(`❌ [Stripe Checkout Debug] Unexpected error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during debug",
        code: "INTERNAL_ERROR",
        details: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Stripe Checkout Debug API",
      usage: "POST with { bundleId: 'your-bundle-id' }",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  )
}
