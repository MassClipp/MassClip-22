import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

// Stripe minimum charge amounts by currency
const STRIPE_MINIMUMS = {
  usd: 0.5,
  eur: 0.5,
  gbp: 0.3,
  cad: 0.5,
  aud: 0.5,
} as const

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Checkout API] === STARTING CHECKOUT FOR BUNDLE: ${params.id} ===`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Checkout API] Authentication failed")
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [Checkout API] User authenticated: ${userId}`)

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Checkout API] Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 },
      )
    }

    const { successUrl, cancelUrl } = body

    // Get bundle data - try productBoxes collection first
    let bundleDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!bundleDoc.exists) {
      // Fallback to bundles collection
      bundleDoc = await db.collection("bundles").doc(params.id).get()
    }

    if (!bundleDoc.exists) {
      console.error(`❌ [Checkout API] Bundle not found: ${params.id}`)
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()
    console.log(`✅ [Checkout API] Bundle found:`, {
      title: bundleData?.title,
      price: bundleData?.price,
      currency: bundleData?.currency || "usd",
      creatorId: bundleData?.creatorId,
      active: bundleData?.active,
    })

    // Validate bundle data
    if (!bundleData?.active) {
      console.error(`❌ [Checkout API] Bundle is inactive: ${params.id}`)
      return NextResponse.json(
        {
          error: "This bundle is currently unavailable",
          code: "BUNDLE_INACTIVE",
        },
        { status: 400 },
      )
    }

    const currency = (bundleData?.currency || "usd").toLowerCase()
    const price = bundleData?.price || 0
    const minimumAmount = STRIPE_MINIMUMS[currency as keyof typeof STRIPE_MINIMUMS] || 0.5

    if (!price || price < minimumAmount) {
      console.error(`❌ [Checkout API] Price ${price} below minimum ${minimumAmount} for ${currency}`)
      return NextResponse.json(
        {
          error: `Minimum charge amount is $${minimumAmount} ${currency.toUpperCase()}`,
          code: "AMOUNT_TOO_SMALL",
          minimumAmount,
          currency,
        },
        { status: 400 },
      )
    }

    // Get creator data
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`❌ [Checkout API] Creator not found: ${bundleData.creatorId}`)
      return NextResponse.json(
        {
          error: "Creator not found",
          code: "CREATOR_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const creatorData = creatorDoc.data()
    console.log(`✅ [Checkout API] Creator found:`, {
      username: creatorData?.username,
      hasStripeAccount: !!creatorData?.stripeAccountId,
      onboardingComplete: creatorData?.stripeOnboardingComplete,
    })

    // Check if creator has Stripe account and can accept payments
    if (!creatorData?.stripeAccountId) {
      console.error(`❌ [Checkout API] Creator has no Stripe account: ${bundleData.creatorId}`)
      return NextResponse.json(
        {
          error: "Payment processing not available for this creator",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      )
    }

    // Verify the Stripe account is actually accessible and can accept payments
    let stripeAccountValid = false
    try {
      console.log(`🔍 [Checkout API] Verifying Stripe account: ${creatorData.stripeAccountId}`)
      const account = await stripe.accounts.retrieve(creatorData.stripeAccountId)

      console.log(`📊 [Checkout API] Account status:`, {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due?.length || 0,
        pastDue: account.requirements?.past_due?.length || 0,
      })

      // Account is valid if it can accept charges and details are submitted
      stripeAccountValid = account.charges_enabled && account.details_submitted

      if (!stripeAccountValid) {
        const issues = []
        if (!account.charges_enabled) issues.push("charges disabled")
        if (!account.details_submitted) issues.push("details not submitted")
        if (account.requirements?.past_due?.length > 0) issues.push("past due requirements")

        console.error(`❌ [Checkout API] Stripe account issues: ${issues.join(", ")}`)
        return NextResponse.json(
          {
            error: `Creator's payment account needs attention: ${issues.join(", ")}`,
            code: "STRIPE_ACCOUNT_INCOMPLETE",
            details: {
              chargesEnabled: account.charges_enabled,
              detailsSubmitted: account.details_submitted,
              requirementsPastDue: account.requirements?.past_due || [],
              requirementsCurrentlyDue: account.requirements?.currently_due || [],
            },
          },
          { status: 400 },
        )
      }
    } catch (stripeError: any) {
      console.error(`❌ [Checkout API] Failed to verify Stripe account:`, stripeError)
      return NextResponse.json(
        {
          error: "Unable to verify creator's payment setup",
          code: "STRIPE_VERIFICATION_FAILED",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }

    console.log(`✅ [Checkout API] Stripe account verified and ready for payments`)

    // Check if user already owns this bundle
    const existingPurchase = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .where("productBoxId", "==", params.id)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.error(`❌ [Checkout API] User already owns bundle: ${params.id}`)
      return NextResponse.json(
        {
          error: "You already own this bundle",
          code: "ALREADY_PURCHASED",
        },
        { status: 400 },
      )
    }

    // Create Stripe checkout session
    try {
      console.log(`🔄 [Checkout API] === CREATING STRIPE CHECKOUT SESSION ===`)
      console.log(`💰 [Checkout API] Price: $${price} (${Math.round(price * 100)} cents)`)
      console.log(`🏦 [Checkout API] Connected account: ${creatorData.stripeAccountId}`)

      const priceInCents = Math.round(price * 100) // Convert to cents
      const platformFeeAmount = Math.round(priceInCents * 0.05) // 5% platform fee
      console.log(`💸 [Checkout API] Platform fee: ${platformFeeAmount} cents`)

      // Use consistent success URL - always redirect to payment-success with payment_intent
      const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?payment_intent={CHECKOUT_SESSION_PAYMENT_INTENT}&account_id=${creatorData.stripeAccountId}`
      const defaultCancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: bundleData.title,
                description: bundleData.description || `Premium content by ${creatorData.username}`,
                images: bundleData.thumbnailUrl ? [bundleData.thumbnailUrl] : undefined,
                metadata: {
                  bundleId: params.id,
                  creatorId: bundleData.creatorId,
                },
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl || defaultSuccessUrl,
        cancel_url: cancelUrl || defaultCancelUrl,
        client_reference_id: userId,
        metadata: {
          productBoxId: params.id,
          buyerUid: userId,
          creatorUid: bundleData.creatorId,
          bundleTitle: bundleData.title,
          connectedAccountId: creatorData.stripeAccountId,
        },
        payment_intent_data: {
          application_fee_amount: platformFeeAmount,
          metadata: {
            productBoxId: params.id,
            buyerUid: userId,
            creatorUid: bundleData.creatorId,
            connectedAccountId: creatorData.stripeAccountId,
          },
        },
      }

      console.log("📝 [Checkout API] Session metadata:", sessionParams.metadata)
      console.log("📝 [Checkout API] Payment intent metadata:", sessionParams.payment_intent_data?.metadata)
      console.log("🔗 [Checkout API] Success URL:", sessionParams.success_url)

      // CRITICAL: Create session on the connected account
      console.log(`🔗 [Checkout API] Creating session on connected account: ${creatorData.stripeAccountId}`)
      const session = await stripe.checkout.sessions.create(sessionParams, {
        stripeAccount: creatorData.stripeAccountId,
      })

      console.log(`✅ [Checkout API] Stripe session created: ${session.id}`)
      console.log(`🔗 [Checkout API] Session URL: ${session.url}`)
      console.log(`🔗 [Checkout API] Session created on account: ${creatorData.stripeAccountId}`)

      // Log the checkout attempt
      await db.collection("checkoutAttempts").add({
        bundleId: params.id,
        buyerId: userId,
        creatorId: bundleData.creatorId,
        sessionId: session.id,
        amount: price,
        currency: currency,
        status: "created",
        stripeAccount: creatorData.stripeAccountId,
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        bundle: {
          id: params.id,
          title: bundleData.title,
          price: price,
          currency: currency,
        },
        creator: {
          id: bundleData.creatorId,
          username: creatorData.username,
          stripeAccountId: creatorData.stripeAccountId,
        },
      })
    } catch (stripeError: any) {
      console.error(`❌ [Checkout API] Stripe error details:`, {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
      })

      // More specific error messages based on Stripe error types
      let userFriendlyMessage = "Failed to create checkout session"

      if (stripeError.code === "account_invalid") {
        userFriendlyMessage = "Creator's payment account needs attention"
      } else if (stripeError.code === "amount_too_small") {
        userFriendlyMessage = `Minimum charge amount is $${minimumAmount} ${currency.toUpperCase()}`
      } else if (stripeError.code === "application_fee_too_large") {
        userFriendlyMessage = "Platform fee configuration error"
      }

      return NextResponse.json(
        {
          error: userFriendlyMessage,
          code: "CHECKOUT_CREATION_FAILED",
          details: stripeError.message || "Unknown Stripe error",
          stripeCode: stripeError.code,
          stripeType: stripeError.type,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error(`❌ [Checkout API] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Checkout API] GET request for bundle: ${params.id}`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    // Get bundle data
    let bundleDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!bundleDoc.exists) {
      bundleDoc = await db.collection("bundles").doc(params.id).get()
    }

    if (!bundleDoc.exists) {
      return NextResponse.json(
        {
          error: "Bundle not found",
          code: "BUNDLE_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()

    // Get creator data to check Stripe status
    const creatorDoc = await db.collection("users").doc(bundleData?.creatorId).get()
    const creatorData = creatorDoc.data()

    const currency = (bundleData?.currency || "usd").toLowerCase()
    const minimumAmount = STRIPE_MINIMUMS[currency as keyof typeof STRIPE_MINIMUMS] || 0.5

    return NextResponse.json({
      success: true,
      bundle: {
        id: params.id,
        title: bundleData?.title,
        description: bundleData?.description,
        price: bundleData?.price,
        currency: currency,
        active: bundleData?.active,
        creatorId: bundleData?.creatorId,
        hasStripeIntegration: !!(creatorData?.stripeAccountId && creatorData?.stripeOnboardingComplete),
        minimumAmount,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Checkout API] GET error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}
