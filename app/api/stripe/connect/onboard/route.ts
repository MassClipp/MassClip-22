import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

interface OnboardRequest {
  idToken: string
  forceRefresh?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, forceRefresh = false } = (await request.json()) as OnboardRequest

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Onboard] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🚀 [Onboard] Starting onboarding process for user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    const existingAccountId = userData?.[accountIdField]

    // If user already has an account, check its status
    if (existingAccountId && !forceRefresh) {
      try {
        const account = await stripe.accounts.retrieve(existingAccountId)

        const isFullyOnboarded =
          account.details_submitted &&
          account.charges_enabled &&
          account.payouts_enabled &&
          (!account.requirements?.currently_due || account.requirements.currently_due.length === 0)

        console.log(`🔍 [Onboard] Existing account ${existingAccountId} status:`, {
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          currently_due: account.requirements?.currently_due?.length || 0,
          isFullyOnboarded,
        })

        if (isFullyOnboarded) {
          // Update local status if needed
          if (!userData?.[connectedField]) {
            await db
              .collection("users")
              .doc(userId)
              .update({
                [connectedField]: true,
                updatedAt: new Date().toISOString(),
              })
          }

          return NextResponse.json({
            success: true,
            onboardingComplete: true,
            accountId: existingAccountId,
            businessType: account.business_type || "individual",
            message: "Account is already fully onboarded and ready to accept payments",
          })
        } else {
          // Account exists but needs completion - create account link
          console.log(`🔄 [Onboard] Account ${existingAccountId} needs completion, creating account link`)

          const accountLink = await stripe.accountLinks.create({
            account: existingAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?success=true`,
            type: "account_onboarding",
          })

          return NextResponse.json({
            success: true,
            onboardingComplete: false,
            onboardingUrl: accountLink.url,
            accountId: existingAccountId,
            resuming: true,
            message: "Resuming onboarding for existing account",
          })
        }
      } catch (stripeError: any) {
        if (stripeError.code === "resource_missing") {
          console.warn(`⚠️ [Onboard] Account ${existingAccountId} no longer exists, will create new one`)
          // Clear the invalid account ID and continue to create new account
          await db
            .collection("users")
            .doc(userId)
            .update({
              [accountIdField]: null,
              [connectedField]: false,
              [`${accountIdField}RemovedAt`]: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
        } else {
          console.error("❌ [Onboard] Error checking existing account:", stripeError)
          return NextResponse.json(
            { error: "Failed to check existing account status", details: stripeError.message },
            { status: 500 },
          )
        }
      }
    }

    // For new accounts or when existing account was deleted, redirect to OAuth flow
    console.log(`🔗 [Onboard] No valid account found, redirecting to OAuth flow`)

    // Generate OAuth URL for account connection
    const clientId = isTestMode ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST : process.env.STRIPE_CONNECT_CLIENT_ID

    if (!clientId) {
      console.error(`❌ [Onboard] Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode`)
      return NextResponse.json(
        { error: `Missing Stripe Connect client ID for ${isTestMode ? "test" : "live"} mode` },
        { status: 500 },
      )
    }

    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        mode: isTestMode ? "test" : "live",
        flow: "onboard_connect",
      }),
    ).toString("base64")

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/stripe-oauth-callback`
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    return NextResponse.json({
      success: true,
      onboardingComplete: false,
      onboardingUrl: oauthUrl,
      accountId: null,
      resuming: false,
      message: "Starting new account connection through OAuth",
    })
  } catch (error: any) {
    console.error("❌ [Onboard] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to start onboarding process", details: error.message }, { status: 500 })
  }
}
