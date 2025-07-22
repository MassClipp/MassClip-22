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
    if (existingAccountId && userData?.[connectedField]) {
      console.log(`✅ [Stripe Onboard] User ${userId} already has connected account: ${existingAccountId}`)

      // Verify the account still exists and is valid
      try {
        const account = await stripe.accounts.retrieve(existingAccountId)
        if (account.charges_enabled && account.payouts_enabled) {
          return NextResponse.json({
            onboardingComplete: true,
            accountId: existingAccountId,
            message: "Account already connected and fully enabled",
          })
        }
      } catch (error) {
        console.warn(`⚠️ [Stripe Onboard] Existing account ${existingAccountId} not found, creating new one`)
      }
    }

    // Create new Express account if none exists or existing one is invalid
    let accountId = existingAccountId

    if (!accountId) {
      console.log(`🔧 [Stripe Onboard] Creating new Express account for user ${userId}`)

      try {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US", // You can make this dynamic based on user location
          email: userData?.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual", // or "company" based on your needs
          metadata: {
            userId: userId,
            platform: "your-platform-name",
            createdAt: new Date().toISOString(),
          },
        })

        accountId = account.id
        console.log(`✅ [Stripe Onboard] Created Express account: ${accountId}`)

        // Save the account ID to Firestore immediately
        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: accountId,
            [`${accountIdField}CreatedAt`]: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
      } catch (error: any) {
        console.error("❌ [Stripe Onboard] Failed to create Express account:", error)
        return NextResponse.json({ error: "Failed to create Stripe account", details: error.message }, { status: 500 })
      }
    }

    // Create account link for onboarding
    try {
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
      })
    } catch (error: any) {
      console.error("❌ [Stripe Onboard] Failed to create account link:", error)
      return NextResponse.json({ error: "Failed to create onboarding link", details: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ [Stripe Onboard] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
