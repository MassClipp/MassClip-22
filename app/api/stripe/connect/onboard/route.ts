import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Stripe Onboard] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔧 [Stripe Onboard] Starting onboarding for user: ${userId}`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    // Check if user already has a connected account
    const existingAccountId = userData?.[accountIdField]

    if (existingAccountId) {
      console.log(`🔍 [Stripe Onboard] Found existing account ID: ${existingAccountId}`)

      try {
        // Verify the account still exists and get its current status
        const account = await stripe.accounts.retrieve(existingAccountId)
        console.log(
          `📊 [Stripe Onboard] Account status - Charges: ${account.charges_enabled}, Payouts: ${account.payouts_enabled}`,
        )

        // If account is fully functional, return success
        if (account.charges_enabled && account.payouts_enabled) {
          console.log(`✅ [Stripe Onboard] Account ${existingAccountId} is fully enabled`)

          // Update user data with latest account info
          await db
            .collection("users")
            .doc(userId)
            .update({
              [connectedField]: true,
              [`${accountIdField}BusinessType`]: account.business_type || "individual",
              [`${accountIdField}Country`]: account.country,
              [`${accountIdField}LastVerified`]: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })

          return NextResponse.json({
            onboardingComplete: true,
            accountId: existingAccountId,
            businessType: account.business_type || "individual",
            message: "Account already connected and fully enabled",
          })
        }

        // Account exists but needs completion - generate new onboarding link
        console.log(`🔄 [Stripe Onboard] Account ${existingAccountId} needs completion`)

        const accountLink = await stripe.accountLinks.create({
          account: existingAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true`,
          type: "account_onboarding",
        })

        return NextResponse.json({
          onboardingComplete: false,
          onboardingUrl: accountLink.url,
          accountId: existingAccountId,
          resuming: true,
          message: "Resuming existing account setup",
        })
      } catch (stripeError: any) {
        // Account doesn't exist in Stripe anymore - clean up and create new one
        if (stripeError.code === "resource_missing") {
          console.warn(`⚠️ [Stripe Onboard] Account ${existingAccountId} no longer exists, cleaning up`)

          await db
            .collection("users")
            .doc(userId)
            .update({
              [accountIdField]: null,
              [connectedField]: false,
              [`${accountIdField}RemovedAt`]: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })

          // Continue to create new account below
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

    // Create new Express account
    console.log(`🏗️ [Stripe Onboard] Creating new Express account for user ${userId}`)

    try {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // You can make this dynamic based on user location
        email: userData?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Let Stripe handle business_type selection during onboarding
        metadata: {
          userId: userId,
          platform: "your-platform-name",
          createdAt: new Date().toISOString(),
        },
      })

      const accountId = account.id
      console.log(`✅ [Stripe Onboard] Created Express account: ${accountId}`)

      // Save the account ID to Firestore immediately
      await db
        .collection("users")
        .doc(userId)
        .update({
          [accountIdField]: accountId,
          [`${accountIdField}CreatedAt`]: new Date().toISOString(),
          [connectedField]: false, // Will be updated when onboarding completes
          updatedAt: new Date().toISOString(),
        })

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      console.log(`🔗 [Stripe Onboard] Created onboarding link for account ${accountId}`)

      return NextResponse.json({
        onboardingComplete: false,
        onboardingUrl: accountLink.url,
        accountId: accountId,
        resuming: false,
        message: "New account created, starting onboarding",
      })
    } catch (stripeError: any) {
      console.error("❌ [Stripe Onboard] Failed to create Express account:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create Stripe account",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Stripe Onboard] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
