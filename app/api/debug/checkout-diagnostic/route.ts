import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundleId } = body

    console.log(`🔍 [Checkout Diagnostic] Checking bundle: ${bundleId}`)

    // Check authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({
        success: false,
        error: "Authentication required",
        step: "auth_check",
      })
    }

    const userId = decodedToken.uid
    console.log(`✅ [Checkout Diagnostic] User authenticated: ${userId}`)

    // Check bundle exists
    let bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    }

    if (!bundleDoc.exists) {
      return NextResponse.json({
        success: false,
        error: "Bundle not found",
        step: "bundle_check",
        bundleId,
      })
    }

    const bundleData = bundleDoc.data()
    console.log(`✅ [Checkout Diagnostic] Bundle found: ${bundleData?.title}`)

    // Check creator exists
    const creatorDoc = await db.collection("users").doc(bundleData?.creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({
        success: false,
        error: "Creator not found",
        step: "creator_check",
        creatorId: bundleData?.creatorId,
      })
    }

    const creatorData = creatorDoc.data()
    console.log(`✅ [Checkout Diagnostic] Creator found: ${creatorData?.username}`)

    // Check Stripe account
    if (!creatorData?.stripeAccountId) {
      return NextResponse.json({
        success: false,
        error: "Creator has no Stripe account",
        step: "stripe_account_check",
        creator: creatorData?.username,
        recommendation: "Creator needs to complete Stripe onboarding",
      })
    }

    // Test Stripe connection
    try {
      await stripe.accounts.retrieve(creatorData.stripeAccountId)
      console.log(`✅ [Checkout Diagnostic] Stripe account verified`)
    } catch (stripeError: any) {
      return NextResponse.json({
        success: false,
        error: "Stripe account error",
        step: "stripe_connection_test",
        details: stripeError.message,
        stripeAccountId: creatorData.stripeAccountId,
      })
    }

    // Check environment configuration
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST

    let activeKey: string | undefined
    if (vercelEnv === "production") {
      activeKey = stripeKey
    } else {
      activeKey = stripeTestKey || stripeKey
    }

    const keyType = activeKey?.startsWith("sk_live_") ? "live" : "test"

    return NextResponse.json({
      success: true,
      diagnostic: {
        bundle: {
          id: bundleId,
          title: bundleData?.title,
          price: bundleData?.price,
          active: bundleData?.active,
        },
        creator: {
          id: bundleData?.creatorId,
          username: creatorData?.username,
          hasStripeAccount: !!creatorData?.stripeAccountId,
          stripeOnboardingComplete: creatorData?.stripeOnboardingComplete,
        },
        environment: {
          vercelEnv,
          keyType,
          hasMainKey: !!stripeKey,
          hasTestKey: !!stripeTestKey,
        },
        checks: {
          auth: "✅ Passed",
          bundle: "✅ Found",
          creator: "✅ Found",
          stripeAccount: "✅ Valid",
          stripeConnection: "✅ Connected",
        },
      },
    })
  } catch (error: any) {
    console.error(`❌ [Checkout Diagnostic] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Diagnostic failed",
        details: error.message,
        step: "unexpected_error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST method to run checkout diagnostic",
    usage: {
      method: "POST",
      body: {
        bundleId: "bundle_id_here",
      },
    },
  })
}
