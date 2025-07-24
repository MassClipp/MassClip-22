import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Processing Stripe OAuth callback...")

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth errors
    if (error) {
      console.error("❌ OAuth error:", error, errorDescription)
      const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
      redirectUrl.searchParams.set("error", error)
      if (errorDescription) {
        redirectUrl.searchParams.set("description", errorDescription)
      }
      return NextResponse.redirect(redirectUrl)
    }

    if (!code || !state) {
      console.error("❌ Missing code or state parameter")
      const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
      redirectUrl.searchParams.set("error", "missing_parameters")
      return NextResponse.redirect(redirectUrl)
    }

    // Verify state parameter
    const stateDoc = await adminDb.collection("stripe_oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.error("❌ Invalid state parameter")
      const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
      redirectUrl.searchParams.set("error", "invalid_state")
      return NextResponse.redirect(redirectUrl)
    }

    const stateData = stateDoc.data()!
    const userId = stateData.userId

    // Check if state has expired
    if (new Date() > stateData.expiresAt.toDate()) {
      console.error("❌ State parameter expired")
      await adminDb.collection("stripe_oauth_states").doc(state).delete()
      const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
      redirectUrl.searchParams.set("error", "expired_state")
      return NextResponse.redirect(redirectUrl)
    }

    console.log("✅ State verified for user:", userId)

    try {
      // Exchange authorization code for access token
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      })

      const accountId = response.stripe_user_id
      console.log("✅ Got Stripe account ID:", accountId)

      // Get account details
      const account = await stripe.accounts.retrieve(accountId)
      console.log("📊 Account details retrieved")

      // Update user profile with Stripe account info
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId: accountId,
        stripeConnected: true,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeEmail: account.email,
        updatedAt: new Date(),
      })

      console.log("✅ User profile updated with Stripe info")

      // Clean up state document
      await adminDb.collection("stripe_oauth_states").doc(state).delete()

      // Redirect to success page
      const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
      redirectUrl.searchParams.set("success", "true")
      redirectUrl.searchParams.set("account_id", accountId)

      return NextResponse.redirect(redirectUrl)
    } catch (stripeError: any) {
      console.error("❌ Stripe API error:", stripeError)
      const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
      redirectUrl.searchParams.set("error", "callback_failed")
      redirectUrl.searchParams.set("description", stripeError.message)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error: any) {
    console.error("❌ OAuth callback error:", error)
    const redirectUrl = new URL("/dashboard/connect-stripe", request.url)
    redirectUrl.searchParams.set("error", "callback_failed")
    redirectUrl.searchParams.set("description", error.message)
    return NextResponse.redirect(redirectUrl)
  }
}
