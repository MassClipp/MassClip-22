import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, getUserFromRequest } from "@/lib/firebase-admin"

// Initialize Stripe with live secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Checking Stripe connection status...")

    // Verify Stripe credentials
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY not found")
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    // Get authenticated user with proper authorization
    const user = await getUserFromRequest(request)
    console.log("👤 User authenticated:", user.uid)

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(user.uid).get()

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
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    console.log("🔍 Fetching account details from Stripe:", stripeAccountId)

    // Get fresh account details from Stripe with proper authorization
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      console.log("📊 Account status:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      // Update cached data in Firestore
      await adminDb
        .collection("users")
        .doc(user.uid)
        .update({
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeDetailsSubmitted: account.details_submitted,
          stripeEmail: account.email,
          stripeAccountStatus: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
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
        requirements: account.requirements,
      })
    } catch (stripeError: any) {
      console.error("❌ Error fetching Stripe account:", stripeError)

      // If account doesn't exist, clear the connection
      if (stripeError.code === "account_invalid") {
        await adminDb.collection("users").doc(user.uid).update({
          stripeAccountId: null,
          stripeConnected: false,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
          stripeEmail: null,
          stripeAccountStatus: "not_connected",
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
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
