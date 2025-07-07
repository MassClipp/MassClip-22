import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

interface CheckoutDebugResult {
  success: boolean
  error?: string
  code?: string
  details?: any
  bundle?: any
  creator?: any
  user?: any
  stripeStatus?: any
  recommendations?: string[]
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Debug API] Starting checkout session debug")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Debug API] Authentication failed")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required to debug checkout sessions",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        } as CheckoutDebugResult,
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [Debug API] User authenticated: ${userId}`)

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Debug API] Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          code: "INVALID_REQUEST_BODY",
          timestamp: new Date().toISOString(),
        } as CheckoutDebugResult,
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
        } as CheckoutDebugResult,
        { status: 400 },
      )
    }

    console.log(`🔍 [Debug API] Debugging bundle: ${bundleId}`)

    const result: CheckoutDebugResult = {
      success: false,
      timestamp: new Date().toISOString(),
      recommendations: [],
    }

    // Step 1: Check if bundle exists
    let bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    let bundleCollection = "productBoxes"

    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("bundles").doc(bundleId).get()
      bundleCollection = "bundles"
    }

    if (!bundleDoc.exists) {
      result.error = "Bundle not found in database"
      result.code = "BUNDLE_NOT_FOUND"
      result.recommendations?.push("Verify the bundle ID is correct")
      result.recommendations?.push("Check if the bundle was deleted")
      result.recommendations?.push("Ensure you're using the right collection (productBoxes vs bundles)")

      console.error(`❌ [Debug API] Bundle not found: ${bundleId}`)
      return NextResponse.json(result, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    result.bundle = {
      id: bundleId,
      title: bundleData?.title,
      description: bundleData?.description,
      price: bundleData?.price,
      currency: bundleData?.currency || "usd",
      active: bundleData?.active,
      creatorId: bundleData?.creatorId,
      collection: bundleCollection,
    }

    console.log(`✅ [Debug API] Bundle found in ${bundleCollection}:`, result.bundle.title)

    // Step 2: Check bundle status
    if (!bundleData?.active) {
      result.error = "Bundle is inactive"
      result.code = "BUNDLE_INACTIVE"
      result.recommendations?.push("Enable the bundle in the creator dashboard")
      result.recommendations?.push("Check the 'active' field in bundle data")
      result.recommendations?.push("Verify bundle has content")

      console.error(`❌ [Debug API] Bundle is inactive: ${bundleId}`)
      return NextResponse.json(result, { status: 400 })
    }

    // Step 3: Check pricing
    if (!bundleData?.price || bundleData.price <= 0) {
      result.error = "Invalid bundle pricing"
      result.code = "INVALID_PRICE"
      result.recommendations?.push("Set a valid price greater than $0")
      result.recommendations?.push("Check the pricing configuration")
      result.recommendations?.push("Ensure currency is set correctly")

      console.error(`❌ [Debug API] Invalid bundle price: ${bundleData?.price}`)
      return NextResponse.json(result, { status: 400 })
    }

    // Step 4: Check creator
    if (!bundleData?.creatorId) {
      result.error = "Bundle has no creator assigned"
      result.code = "NO_CREATOR"
      result.recommendations?.push("Assign a creator to this bundle")
      result.recommendations?.push("Check the creatorId field")

      console.error(`❌ [Debug API] Bundle has no creator: ${bundleId}`)
      return NextResponse.json(result, { status: 400 })
    }

    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      result.error = "Creator not found"
      result.code = "CREATOR_NOT_FOUND"
      result.recommendations?.push("Verify the creator ID is correct")
      result.recommendations?.push("Check if the creator account was deleted")

      console.error(`❌ [Debug API] Creator not found: ${bundleData.creatorId}`)
      return NextResponse.json(result, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    result.creator = {
      id: bundleData.creatorId,
      username: creatorData?.username,
      email: creatorData?.email,
      hasStripeAccount: !!creatorData?.stripeAccountId,
      onboardingComplete: creatorData?.stripeOnboardingComplete,
      stripeAccountId: creatorData?.stripeAccountId,
    }

    console.log(`✅ [Debug API] Creator found:`, result.creator.username)

    // Step 5: Check Stripe integration
    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboardingComplete) {
      result.error = "Creator hasn't completed Stripe setup"
      result.code = "NO_STRIPE_ACCOUNT"
      result.recommendations?.push("Creator needs to complete Stripe Connect onboarding")
      result.recommendations?.push("Check stripeAccountId and stripeOnboardingComplete fields")
      result.recommendations?.push("Verify Stripe Connect integration")
      result.recommendations?.push("Guide creator through /dashboard/connect-stripe")

      console.error(`❌ [Debug API] Creator not ready for payments: ${bundleData.creatorId}`)
      return NextResponse.json(result, { status: 400 })
    }

    // Step 6: Check if user already purchased
    const existingPurchase = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", bundleId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      result.error = "User already owns this bundle"
      result.code = "ALREADY_PURCHASED"
      result.recommendations?.push("Redirect user to content instead of checkout")
      result.recommendations?.push("Check user's purchases collection")
      result.recommendations?.push("Consider offering different bundles")

      console.error(`❌ [Debug API] User already owns bundle: ${bundleId}`)
      return NextResponse.json(result, { status: 400 })
    }

    // Step 7: Test Stripe account status
    try {
      const account = await stripe.accounts.retrieve(creatorData.stripeAccountId)
      result.stripeStatus = {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
        requirementsEventuallyDue: account.requirements?.eventually_due || [],
      }

      if (!account.charges_enabled) {
        result.error = "Creator's Stripe account cannot accept charges"
        result.code = "STRIPE_CHARGES_DISABLED"
        result.recommendations?.push("Creator needs to complete Stripe verification")
        result.recommendations?.push("Check Stripe account requirements")
        result.recommendations?.push("Complete any pending verification steps")

        console.error(`❌ [Debug API] Stripe charges disabled for: ${creatorData.stripeAccountId}`)
        return NextResponse.json(result, { status: 400 })
      }

      console.log(`✅ [Debug API] Stripe account verified:`, account.id)
    } catch (stripeError: any) {
      result.error = `Stripe account error: ${stripeError.message}`
      result.code = "STRIPE_ACCOUNT_ERROR"
      result.recommendations?.push("Check Stripe account configuration")
      result.recommendations?.push("Verify Stripe API keys")
      result.recommendations?.push("Re-connect Stripe account")

      console.error(`❌ [Debug API] Stripe error:`, stripeError)
      return NextResponse.json(result, { status: 400 })
    }

    // Step 8: Check environment variables
    const envIssues = []
    if (!process.env.STRIPE_SECRET_KEY) envIssues.push("STRIPE_SECRET_KEY missing")
    if (!process.env.NEXT_PUBLIC_SITE_URL) envIssues.push("NEXT_PUBLIC_SITE_URL missing")

    if (envIssues.length > 0) {
      result.error = `Environment configuration issues: ${envIssues.join(", ")}`
      result.code = "ENV_CONFIG_ERROR"
      result.recommendations?.push("Check environment variables")
      result.recommendations?.push("Verify Stripe configuration")

      console.error(`❌ [Debug API] Environment issues:`, envIssues)
      return NextResponse.json(result, { status: 500 })
    }

    // All checks passed!
    result.success = true
    result.recommendations?.push("All checks passed - checkout should work")
    result.recommendations?.push("Try creating a checkout session")
    result.recommendations?.push("Monitor Stripe dashboard for any issues")

    console.log(`✅ [Debug API] All checks passed for bundle: ${bundleId}`)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [Debug API] Unexpected error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during debug",
        code: "INTERNAL_ERROR",
        details: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      } as CheckoutDebugResult,
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Use POST method with bundleId in body",
      code: "METHOD_NOT_ALLOWED",
      timestamp: new Date().toISOString(),
    } as CheckoutDebugResult,
    { status: 405 },
  )
}
