import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log("🔍 Checking Stripe status for user:", userId)

    // Get user document from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log("❌ No Stripe account ID found for user")
      return NextResponse.json({
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })
    }

    try {
      // Get account details from Stripe
      console.log("📡 Fetching account details from Stripe...")
      const account = await stripe.accounts.retrieve(stripeAccountId)

      const status = {
        connected: account.details_submitted && account.charges_enabled,
        accountId: stripeAccountId,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        email: account.email,
        country: account.country,
        businessType: account.business_type,
      }

      console.log("✅ Stripe account status:", status)

      // Update user document with latest status
      await adminDb.collection("users").doc(userId).update({
        stripeAccountStatus: status,
        stripeConnected: status.connected,
        stripeChargesEnabled: status.chargesEnabled,
        stripePayoutsEnabled: status.payoutsEnabled,
        stripeDetailsSubmitted: status.detailsSubmitted,
        lastStripeStatusCheck: new Date(),
        updatedAt: new Date(),
      })

      return NextResponse.json(status)

    } catch (stripeError: any) {
      console.error("❌ Stripe account retrieval error:", stripeError)
      
      // If account doesn't exist in Stripe, clean up our records
      if (stripeError.code === 'resource_missing') {
        console.log("🧹 Cleaning up missing Stripe account from user record")
        await adminDb.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeAccountStatus: null,
          stripeConnected: false,
          updatedAt: new Date(),
        })
        
        return NextResponse.json({
          connected: false,
          accountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        })
      }

      // For other Stripe errors, return cached data if available
      return NextResponse.json({
        connected: userData.stripeConnected || false,
        accountId: stripeAccountId,
        chargesEnabled: userData.stripeChargesEnabled || false,
        payoutsEnabled: userData.stripePayoutsEnabled || false,
        detailsSubmitted: userData.stripeDetailsSubmitted || false,
        error: "Could not fetch fresh data from Stripe",
      })
    }

  } catch (error) {
    console.error("❌ Stripe status check error:", error)
    return NextResponse.json(
      { 
        error: "Failed to check Stripe status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
