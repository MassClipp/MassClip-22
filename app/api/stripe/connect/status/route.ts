import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("📊 Checking Stripe connection status...")

    // Get authenticated user
    const { uid } = await getUserFromRequest(request)
    console.log("👤 User authenticated:", uid)

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      console.error("❌ User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      console.log("ℹ️ No Stripe account connected")
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    console.log("🔍 Fetching account details from Stripe:", stripeAccountId)

    // Get fresh account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)
      
      console.log("📊 Account status:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      // Update cached data in Firestore
      await adminDb.collection("users").doc(uid).update({
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeEmail: account.email,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        connected: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        email: account.email,
        status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
      })
    } catch (stripeError: any) {
      console.error("❌ Error fetching Stripe account:", stripeError)
      
      // If account doesn't exist, clear the connection
      if (stripeError.code === "account_invalid") {
        await adminDb.collection("users").doc(uid).update({
          stripeAccountId: null,
          stripeConnected: false,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
          stripeEmail: null,
          updatedAt: new Date(),
        })

        return NextResponse.json({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: "not_connected",
        })
      }

      // Return cached data if Stripe API fails
      return NextResponse.json({
        connected: true,
        accountId: stripeAccountId,
        chargesEnabled: userData.stripeChargesEnabled || false,
        payoutsEnabled: userData.stripePayoutsEnabled || false,
        detailsSubmitted: userData.stripeDetailsSubmitted || false,
        email: userData.stripeEmail,
        status: "unknown",
        error: "Failed to fetch fresh data from Stripe",
      })
    }
  } catch (error: any) {
    console.error("❌ Error checking Stripe status:", error)
    return NextResponse.json(
      {
        error: "Failed to check Stripe status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
