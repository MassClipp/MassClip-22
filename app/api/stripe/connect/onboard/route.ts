import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { idToken, returnUrl, refreshUrl } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Stripe Connect] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Stripe Connect] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔗 [Stripe Connect] Starting onboarding for user: ${userId} (${isTestMode ? "TEST" : "LIVE"} mode)`)

    // Check if user already has a connected account
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    const existingAccountId = isTestMode ? userData.stripeTestAccountId : userData.stripeAccountId

    if (existingAccountId) {
      console.log(`🔍 [Stripe Connect] Checking existing account: ${existingAccountId}`)

      try {
        // Check if the existing account is complete
        const account = await stripe.accounts.retrieve(existingAccountId)

        if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
          console.log(`✅ [Stripe Connect] Account already complete: ${existingAccountId}`)
          return NextResponse.json({
            success: true,
            onboardingComplete: true,
            accountId: existingAccountId,
          })
        } else {
          console.log(`⚠️ [Stripe Connect] Account needs completion: ${existingAccountId}`)
          // Create account link for existing account
          const accountLink = await stripe.accountLinks.create({
            account: existingAccountId,
            refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?refresh=true`,
            return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?success=true`,
            type: "account_onboarding",
          })

          return NextResponse.json({
            success: true,
            onboardingUrl: accountLink.url,
            accountId: existingAccountId,
          })
        }
      } catch (error: any) {
        console.error(`❌ [Stripe Connect] Error checking existing account:`, error)
        // If account doesn't exist or is invalid, create a new one
      }
    }

    // Create new connected account
    console.log(`🆕 [Stripe Connect] Creating new connected account for ${userId}`)

    const account = await stripe.accounts.create({
      type: "express",
      country: "US", // Default to US, can be changed during onboarding
      email: decodedToken.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual", // Can be changed during onboarding
      metadata: {
        firebaseUid: userId,
        username: userData.username || "",
        email: decodedToken.email || "",
        environment: isTestMode ? "test" : "live",
        createdAt: new Date().toISOString(),
      },
    })

    console.log(`✅ [Stripe Connect] Created account: ${account.id}`)

    // Store the account ID in Firestore
    const updateData = isTestMode
      ? {
          stripeTestAccountId: account.id,
          stripeTestAccountCreated: new Date(),
          // Also set as primary account ID in test mode for easier access
          stripeAccountId: account.id,
        }
      : {
          stripeAccountId: account.id,
          stripeAccountCreated: new Date(),
        }

    await db.collection("users").doc(userId).update(updateData)

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?refresh=true`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [Stripe Connect] Created onboarding link for: ${account.id}`)

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: account.id,
    })
  } catch (error: any) {
    console.error("❌ [Stripe Connect] Onboarding error:", error)
    return NextResponse.json(
      {
        error: "Failed to create Stripe Connect account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
