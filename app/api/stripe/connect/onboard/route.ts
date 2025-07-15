import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

interface OnboardBody {
  idToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as OnboardBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (tokenError) {
      console.error("❌ [Onboard] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`🚀 [Onboard] Starting onboarding for user: ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode`)

    // Check if user already has a connected account for this mode
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const existingAccountId = userData?.[accountIdField]

    if (existingAccountId) {
      // Verify the existing account is still valid
      try {
        const existingAccount = await stripe.accounts.retrieve(existingAccountId)
        if (existingAccount.charges_enabled && existingAccount.payouts_enabled) {
          return NextResponse.json({
            success: true,
            accountId: existingAccount.id,
            message: `${isTestMode ? "Test" : "Live"} account already connected and operational`,
            alreadyConnected: true,
          })
        }
      } catch (error) {
        console.log(`⚠️ [Onboard] Existing account ${existingAccountId} is no longer valid, creating new one`)
      }
    }

    // Create a new Stripe Connect account
    let account
    try {
      account = await stripe.accounts.create({
        type: "express",
        country: "US", // Default to US, can be changed during onboarding
        email: decodedToken.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual", // Default to individual
        settings: {
          payouts: {
            schedule: {
              interval: "daily",
            },
          },
        },
      })

      console.log(`✅ [Onboard] Created Stripe account: ${account.id}`)
    } catch (stripeError: any) {
      console.error("❌ [Onboard] Failed to create Stripe account:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create Stripe account: ${stripeError.message}`,
        },
        { status: 400 },
      )
    }

    // Create account link for onboarding
    try {
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/success`,
        type: "account_onboarding",
      })

      // Save the account ID to Firestore (even before completion)
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: account.id,
          [`${accountIdField}CreatedAt`]: new Date(),
          [`${accountIdField}OnboardingStarted`]: true,
        })

      console.log(`✅ [Onboard] Account link created for ${account.id}`)

      return NextResponse.json({
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
        message: `${isTestMode ? "Test" : "Live"} account created, redirecting to onboarding`,
      })
    } catch (linkError: any) {
      console.error("❌ [Onboard] Failed to create account link:", linkError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create onboarding link: ${linkError.message}`,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Onboard] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during onboarding",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
