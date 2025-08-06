import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { saveConnectedStripeAccount } from "@/lib/stripe-accounts-service"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    console.log("🔄 Processing Stripe OAuth callback")
    console.log("- Code:", !!code)
    console.log("- State:", state)
    console.log("- Error:", error)

    if (error) {
      console.error("❌ Stripe OAuth error:", error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      console.error("❌ Missing code or state parameter")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=missing_parameters`
      )
    }

    // Parse the state to get userId
    let userId: string
    try {
      const stateData = JSON.parse(decodeURIComponent(state))
      userId = stateData.userId
      
      if (!userId) {
        throw new Error("No userId in state")
      }
    } catch (parseError) {
      console.error("❌ Invalid state parameter:", parseError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=invalid_state`
      )
    }

    console.log(`🔄 Processing OAuth for user: ${userId}`)

    try {
      // Exchange the authorization code for access token
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      })

      const stripeAccountId = response.stripe_user_id
      console.log(`✅ Got Stripe account ID: ${stripeAccountId}`)

      // Get the full account details
      const stripeAccount = await stripe.accounts.retrieve(stripeAccountId)

      // Save to our centralized collection
      await saveConnectedStripeAccount(userId, stripeAccount)

      // Also update the user's document for backward compatibility
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId: stripeAccount.id,
        stripeAccountStatus: stripeAccount.details_submitted ? "active" : "pending",
        stripeChargesEnabled: stripeAccount.charges_enabled,
        stripePayoutsEnabled: stripeAccount.payouts_enabled,
        stripeDetailsSubmitted: stripeAccount.details_submitted,
        updatedAt: new Date(),
      })

      console.log(`✅ Successfully connected Stripe account for user: ${userId}`)

      // Redirect to success page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe/callback?success=true&account_id=${stripeAccountId}`
      )
    } catch (stripeError) {
      console.error("❌ Stripe OAuth token exchange failed:", stripeError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=oauth_failed`
      )
    }
  } catch (error) {
    console.error("❌ OAuth callback processing failed:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=callback_failed`
    )
  }
}
