import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, country = "US" } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔄 [Onboard] Creating Express account for user: ${userId}`)

    // Check if user already has an account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const existingAccountId = userData?.[accountIdField]

    if (existingAccountId) {
      console.log(`⚠️ [Onboard] User ${userId} already has account ${existingAccountId}`)

      // Check if existing account is still valid
      try {
        const existingAccount = await stripe.accounts.retrieve(existingAccountId)

        // Create account link for existing account
        const accountLink = await stripe.accountLinks.create({
          account: existingAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true&account=${existingAccountId}`,
          type: "account_onboarding",
        })

        return NextResponse.json({
          url: accountLink.url,
          accountId: existingAccountId,
          existing: true,
          mode: isTestMode ? "test" : "live",
        })
      } catch (stripeError) {
        console.log(`🗑️ [Onboard] Existing account ${existingAccountId} is invalid, creating new one`)
        // Continue to create new account
      }
    }

    // Create new Express account
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual", // Can be changed during onboarding
      settings: {
        payouts: {
          schedule: {
            interval: "daily", // or 'weekly', 'monthly'
          },
        },
      },
    })

    console.log(`✅ [Onboard] Created Express account: ${account.id}`)

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true&account=${account.id}`,
      type: "account_onboarding",
    })

    console.log(`✅ [Onboard] Created account link for ${account.id}`)

    // Save account info to database
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const detailsField = isTestMode ? "stripeTestAccountDetails" : "stripeAccountDetails"

    const accountDetails = {
      id: account.id,
      country: account.country,
      email: account.email,
      type: account.type,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    await db
      .collection("users")
      .doc(userId)
      .update({
        [accountIdField]: account.id,
        [connectedField]: true,
        [detailsField]: accountDetails,
        updatedAt: new Date().toISOString(),
      })

    return NextResponse.json({
      url: accountLink.url,
      accountId: account.id,
      existing: false,
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [Onboard] Error creating Express account:", error)
    return NextResponse.json({ error: "Failed to create Express account", details: error.message }, { status: 500 })
  }
}
