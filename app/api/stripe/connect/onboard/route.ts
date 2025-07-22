import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"
import { getSiteUrl } from "@/lib/url-utils"

export async function POST(request: NextRequest) {
  console.log("🔄 [Stripe Onboard] Starting onboarding process...")

  try {
    const { idToken } = await request.json()
    console.log("📝 [Stripe Onboard] Received request with idToken:", !!idToken)

    if (!idToken) {
      console.error("❌ [Stripe Onboard] No ID token provided")
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
      console.log("✅ [Stripe Onboard] Firebase token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Stripe Onboard] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user data from Firestore
    console.log("🔍 [Stripe Onboard] Fetching user data from Firestore...")
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      console.error("❌ [Stripe Onboard] User not found in Firestore:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const existingAccountId = userData?.[accountIdField]

    console.log("📊 [Stripe Onboard] User data check:", {
      userId,
      hasExistingAccount: !!existingAccountId,
      accountId: existingAccountId,
      testMode: isTestMode,
    })

    // Check if user already has a Stripe account
    if (existingAccountId) {
      try {
        const existingAccount = await stripe.accounts.retrieve(existingAccountId)
        console.log("🔍 [Stripe Onboard] Existing account found:", {
          accountId: existingAccountId,
          chargesEnabled: existingAccount.charges_enabled,
          payoutsEnabled: existingAccount.payouts_enabled,
        })

        // If account exists and is complete, return success
        if (existingAccount.charges_enabled && existingAccount.payouts_enabled) {
          console.log("✅ [Stripe Onboard] Account already fully connected")
          return NextResponse.json({
            success: true,
            message: "Account already connected",
            accountId: existingAccountId,
          })
        }

        // If account exists but needs completion, create new onboarding link
        console.log("🔄 [Stripe Onboard] Creating onboarding link for existing account...")
        const accountLink = await stripe.accountLinks.create({
          account: existingAccountId,
          refresh_url: `${getSiteUrl()}/dashboard/connect-stripe?refresh=true`,
          return_url: `${getSiteUrl()}/dashboard/earnings?connected=true`,
          type: "account_onboarding",
        })

        console.log("✅ [Stripe Onboard] Onboarding link created for existing account")
        return NextResponse.json({
          success: true,
          url: accountLink.url,
          accountId: existingAccountId,
        })
      } catch (stripeError: any) {
        if (stripeError.code === "resource_missing") {
          console.warn("⚠️ [Stripe Onboard] Existing account not found in Stripe, creating new one...")
          // Account was deleted, continue to create new one
        } else {
          console.error("❌ [Stripe Onboard] Error checking existing account:", stripeError)
          return NextResponse.json(
            {
              error: "Failed to verify existing account",
              details: stripeError.message,
            },
            { status: 500 },
          )
        }
      }
    }

    // Create new Stripe Express account
    console.log("🆕 [Stripe Onboard] Creating new Stripe Express account...")
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        userId: userId,
        createdAt: new Date().toISOString(),
        source: "massclip_onboarding",
      },
    })

    console.log("✅ [Stripe Onboard] New account created:", account.id)

    // Save account ID to Firestore
    console.log("💾 [Stripe Onboard] Saving account ID to Firestore...")
    await db
      .collection("users")
      .doc(userId)
      .update({
        [accountIdField]: account.id,
        [`${accountIdField}CreatedAt`]: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

    // Create account onboarding link
    console.log("🔗 [Stripe Onboard] Creating onboarding link...")
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${getSiteUrl()}/dashboard/connect-stripe?refresh=true`,
      return_url: `${getSiteUrl()}/dashboard/earnings?connected=true`,
      type: "account_onboarding",
    })

    console.log("✅ [Stripe Onboard] Onboarding process completed successfully")
    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
    })
  } catch (error: any) {
    console.error("❌ [Stripe Onboard] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create Stripe account",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
