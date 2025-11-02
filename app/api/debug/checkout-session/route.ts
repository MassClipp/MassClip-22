import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Checkout Debug] Starting debug session`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required to debug checkout sessions",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [Checkout Debug] User authenticated: ${userId}`)

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

    console.log(`🔍 [Checkout Debug] Debugging bundle: ${bundleId}`)

    const debugResult: any = {
      success: false,
      bundleId,
      userId,
      timestamp: new Date().toISOString(),
      recommendations: [],
    }

    // Step 1: Check if bundle exists
    let bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    let collection = "productBoxes"

    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("bundles").doc(bundleId).get()
      collection = "bundles"
    }

    if (!bundleDoc.exists) {
      // Try to find similar bundle IDs
      const productBoxesSnapshot = await db.collection("productBoxes").limit(10).get()
      const bundlesSnapshot = await db.collection("bundles").limit(10).get()

      const allBundles = [
        ...productBoxesSnapshot.docs.map((doc) => ({ id: doc.id, collection: "productBoxes", data: doc.data() })),
        ...bundlesSnapshot.docs.map((doc) => ({ id: doc.id, collection: "bundles", data: doc.data() })),
      ]

      // Find bundles with similar titles or IDs
      const similarBundles = allBundles.filter(
        (bundle) =>
          bundle.id.includes(bundleId.replace("product-", "")) ||
          bundle.data.title?.toLowerCase().includes("viral") ||
          bundle.data.title?.toLowerCase().includes("clips"),
      )

      debugResult.error = "Bundle not found in database"
      debugResult.code = "BUNDLE_NOT_FOUND"
      debugResult.recommendations.push("Verify the bundle ID is correct")
      debugResult.recommendations.push("Check if the bundle was deleted")
      debugResult.recommendations.push(
        "Use the Bundle Finder tool at /debug-bundle-finder to see all available bundles",
      )

      if (similarBundles.length > 0) {
        debugResult.recommendations.push("Found similar bundles - check the Bundle Finder for correct IDs")
        debugResult.similarBundles = similarBundles.map((b) => ({
          id: b.id,
          title: b.data.title,
          collection: b.collection,
          active: b.data.active,
        }))
      }

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
      thumbnailUrl: bundleData?.thumbnailUrl,
    }

    console.log(`✅ [Checkout Debug] Bundle found in ${collection}:`, {
      title: bundleData?.title,
      price: bundleData?.price,
      active: bundleData?.active,
    })

    // Step 2: Validate bundle data
    if (!bundleData?.active) {
      debugResult.error = "Bundle is inactive and cannot be purchased"
      debugResult.code = "BUNDLE_INACTIVE"
      debugResult.recommendations.push("Enable the bundle in the creator dashboard")
      debugResult.recommendations.push("Check if the bundle has content added")
      debugResult.recommendations.push("Verify bundle pricing is set")

      return NextResponse.json(debugResult, { status: 400 })
    }

    if (!bundleData?.price || bundleData.price <= 0) {
      debugResult.error = "Bundle has invalid pricing"
      debugResult.code = "INVALID_PRICE"
      debugResult.recommendations.push("Set a valid price greater than $0")
      debugResult.recommendations.push("Check currency settings")
      debugResult.recommendations.push("Verify Stripe minimum amount requirements")

      return NextResponse.json(debugResult, { status: 400 })
    }

    // Step 3: Check creator
    if (!bundleData?.creatorId) {
      debugResult.error = "Bundle has no creator assigned"
      debugResult.code = "NO_CREATOR"
      debugResult.recommendations.push("Assign a creator to this bundle")

      return NextResponse.json(debugResult, { status: 400 })
    }

    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      debugResult.error = "Creator not found in database"
      debugResult.code = "CREATOR_NOT_FOUND"
      debugResult.recommendations.push("Verify the creator ID is correct")
      debugResult.recommendations.push("Check if the creator account was deleted")

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

    console.log(`✅ [Checkout Debug] Creator found:`, {
      username: creatorData?.username,
      hasStripeAccount: !!creatorData?.stripeAccountId,
      onboardingComplete: creatorData?.stripeOnboardingComplete,
    })

    // Step 4: Check Stripe integration
    if (!creatorData?.stripeAccountId || !creatorData?.stripeOnboardingComplete) {
      debugResult.error = "Creator has not completed Stripe setup"
      debugResult.code = "NO_STRIPE_ACCOUNT"
      debugResult.recommendations.push("Creator needs to complete Stripe Connect onboarding")
      debugResult.recommendations.push("Check /dashboard/connect-stripe page")
      debugResult.recommendations.push("Verify Stripe webhook configuration")

      return NextResponse.json(debugResult, { status: 400 })
    }

    // Step 5: Check if user already purchased
    const existingPurchase = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", bundleId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      debugResult.error = "User already owns this bundle"
      debugResult.code = "ALREADY_PURCHASED"
      debugResult.recommendations.push("Redirect user to content instead of checkout")
      debugResult.recommendations.push("Check user's purchases collection")
      debugResult.recommendations.push("Consider offering different bundles")

      return NextResponse.json(debugResult, { status: 400 })
    }

    // Step 6: Check environment and Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST
    const vercelEnv = process.env.VERCEL_ENV || "development"

    debugResult.stripeStatus = {
      hasMainKey: !!stripeKey,
      hasTestKey: !!stripeTestKey,
      environment: vercelEnv,
      isProduction: vercelEnv === "production",
      keyType: stripeKey?.startsWith("sk_live_") ? "live" : stripeKey?.startsWith("sk_test_") ? "test" : "unknown",
    }

    // Step 7: All checks passed
    debugResult.success = true
    debugResult.error = null
    debugResult.recommendations.push("All checks passed - checkout should work")
    debugResult.recommendations.push("If still failing, check Stripe dashboard for account issues")
    debugResult.recommendations.push("Verify webhook endpoints are configured correctly")

    console.log(`✅ [Checkout Debug] All checks passed for bundle: ${bundleId}`)

    return NextResponse.json(debugResult)
  } catch (error: any) {
    console.error(`❌ [Checkout Debug] Unexpected error:`, error)
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
      message: "Checkout Session Debug API",
      usage: "POST with { bundleId: 'your-bundle-id' }",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  )
}
