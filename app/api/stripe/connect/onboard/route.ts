import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Stripe Onboard] Starting onboarding process...")

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request.headers)
    const userId = authUser.uid

    console.log(`🔄 [Stripe Onboard] Creating account for user: ${userId}`)

    // Check if user already has a connected Stripe account
    const existingAccountDoc = await adminDb.collection("connectedStripeAccounts").doc(userId).get()
    
    let accountId: string

    if (existingAccountDoc.exists) {
      const existingData = existingAccountDoc.data()!
      accountId = existingData.stripeAccountId
      console.log(`✅ [Stripe Onboard] Using existing Stripe account: ${accountId}`)
    } else {
      // Create new Stripe Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: userId,
          platform: "massclip",
        },
      })

      accountId = account.id
      console.log(`✅ [Stripe Onboard] Created new Stripe account: ${accountId}`)

      // Save the account to connectedStripeAccounts collection
      await adminDb.collection("connectedStripeAccounts").doc(userId).set({
        stripeAccountId: accountId,
        userId: userId,
        email: authUser.email || "",
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        country: account.country,
        business_type: account.business_type,
        default_currency: account.default_currency,
        requirements: account.requirements?.currently_due || [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      console.log(`✅ [Stripe Onboard] Saved account to connectedStripeAccounts collection`)
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?onboarding=success`,
      type: "account_onboarding",
    })

    console.log(`✅ [Stripe Onboard] Created account link successfully`)

    return NextResponse.json({ 
      url: accountLink.url,
      accountId: accountId
    })

  } catch (error: any) {
    console.error("❌ [Stripe Onboard] Error:", error)
    return NextResponse.json(
      { error: "Failed to create onboarding link", details: error.message },
      { status: 500 }
    )
  }
}
