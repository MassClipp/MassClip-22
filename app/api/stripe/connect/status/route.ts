import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Fetching Stripe connection status...")

    // Get authenticated user
    const { uid } = await getAuthenticatedUser(request.headers)
    console.log("👤 User authenticated:", uid)

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      console.error("❌ User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    console.log("📄 User data:", {
      stripeAccountId: userData.stripeAccountId,
      stripeConnected: userData.stripeConnected,
    })

    // If no Stripe account connected
    if (!userData.stripeAccountId) {
      console.log("ℹ️ No Stripe account connected")
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })
    }

    // Fetch current account status from Stripe
    console.log("🔄 Fetching account status from Stripe...")
    try {
      const account = await stripe.accounts.retrieve(userData.stripeAccountId)

      console.log("✅ Account status retrieved:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      // Update local cache if status has changed
      const needsUpdate =
        userData.stripeChargesEnabled !== account.charges_enabled ||
        userData.stripePayoutsEnabled !== account.payouts_enabled ||
        userData.stripeDetailsSubmitted !== account.details_submitted

      if (needsUpdate) {
        console.log("🔄 Updating cached status in Firestore...")
        await adminDb.collection("users").doc(uid).update({
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeDetailsSubmitted: account.details_submitted,
          updatedAt: new Date(),
        })
      }

      return NextResponse.json({
        connected: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        email: account.email,
      })
    } catch (stripeError: any) {
      console.error("❌ Error fetching account from Stripe:", stripeError)

      // If account doesn't exist in Stripe, clean up local data
      if (stripeError.code === "resource_missing") {
        console.log("🧹 Cleaning up invalid Stripe account reference...")
        await adminDb.collection("users").doc(uid).update({
          stripeAccountId: null,
          stripeConnected: false,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
          updatedAt: new Date(),
        })

        return NextResponse.json({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        })
      }

      // For other errors, return cached data
      return NextResponse.json({
        connected: userData.stripeConnected || false,
        accountId: userData.stripeAccountId,
        chargesEnabled: userData.stripeChargesEnabled || false,
        payoutsEnabled: userData.stripePayoutsEnabled || false,
        detailsSubmitted: userData.stripeDetailsSubmitted || false,
        error: "Unable to fetch latest status from Stripe",
      })
    }
  } catch (error) {
    console.error("❌ Error in status endpoint:", error)
    return NextResponse.json({ error: "Failed to fetch Stripe status" }, { status: 500 })
  }
}
