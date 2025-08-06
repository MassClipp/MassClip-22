import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Connect Status] Checking Stripe connection status...")

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request.headers)
    const userId = authUser.uid

    const { refresh = false } = await request.json()

    console.log(`🔍 [Connect Status] Checking status for user: ${userId}, refresh: ${refresh}`)

    // Get account from connectedStripeAccounts collection
    const accountDoc = await adminDb.collection("connectedStripeAccounts").doc(userId).get()

    if (!accountDoc.exists) {
      console.log("ℹ️ [Connect Status] No connected Stripe account found")
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    const accountData = accountDoc.data()!
    const stripeAccountId = accountData.stripeAccountId

    console.log(`✅ [Connect Status] Found connected account: ${stripeAccountId}`)

    let finalAccountData = accountData

    // If refresh requested, get fresh data from Stripe
    if (refresh) {
      try {
        console.log("🔄 [Connect Status] Refreshing account data from Stripe...")
        const account = await stripe.accounts.retrieve(stripeAccountId)

        // Update our stored data
        const updatedData = {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          country: account.country,
          business_type: account.business_type,
          default_currency: account.default_currency,
          requirements: account.requirements?.currently_due || [],
          updatedAt: FieldValue.serverTimestamp(),
        }

        await adminDb.collection("connectedStripeAccounts").doc(userId).update(updatedData)

        finalAccountData = { ...accountData, ...updatedData }
        console.log("✅ [Connect Status] Account data refreshed successfully")
      } catch (stripeError: any) {
        console.error("❌ [Connect Status] Error refreshing from Stripe:", stripeError)
        // Continue with cached data
      }
    }

    return NextResponse.json({
      connected: true,
      accountId: stripeAccountId,
      chargesEnabled: finalAccountData.charges_enabled || false,
      payoutsEnabled: finalAccountData.payouts_enabled || false,
      detailsSubmitted: finalAccountData.details_submitted || false,
      status: finalAccountData.details_submitted ? "active" : "pending",
      country: finalAccountData.country,
      email: finalAccountData.email,
      businessType: finalAccountData.business_type,
      defaultCurrency: finalAccountData.default_currency,
      requirements: finalAccountData.requirements || [],
      livemode: true, // Assuming production
    })

  } catch (error: any) {
    console.error("❌ [Connect Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to check connection status", details: error.message },
      { status: 500 }
    )
  }
}
