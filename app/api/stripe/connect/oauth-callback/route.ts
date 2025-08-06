import { type NextRequest, NextResponse } from "next/server"
import { 
  exchangeOAuthCode, 
  getStripeAccountDetails, 
  saveConnectedAccount 
} from "@/lib/stripe-connect-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log("🔄 Processing Stripe Connect OAuth callback")
    console.log("- Code:", !!code)
    console.log("- State:", state)
    console.log("- Error:", error)

    // Handle OAuth errors
    if (error) {
      console.error("❌ Stripe OAuth error:", error, errorDescription)
      const errorMessage = errorDescription || error
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=${encodeURIComponent(errorMessage)}`
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("❌ Missing required OAuth parameters")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=missing_parameters`
      )
    }

    // Parse state to get user ID
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

    console.log(`🔄 Processing OAuth callback for user: ${userId}`)

    try {
      // Step 1: Exchange code for OAuth tokens
      console.log("🔄 Step 1: Exchanging OAuth code...")
      const oauthData = await exchangeOAuthCode(code)
      
      // Step 2: Get full account details from Stripe
      console.log("🔄 Step 2: Fetching account details...")
      const accountDetails = await getStripeAccountDetails(oauthData.stripe_user_id)
      
      // Step 3: Save everything to Firestore
      console.log("🔄 Step 3: Saving to Firestore...")
      await saveConnectedAccount(userId, oauthData, accountDetails)
      
      console.log(`✅ Successfully connected Stripe account for user: ${userId}`)
      console.log(`- Account ID: ${oauthData.stripe_user_id}`)
      console.log(`- Charges Enabled: ${accountDetails.charges_enabled}`)
      console.log(`- Payouts Enabled: ${accountDetails.payouts_enabled}`)
      console.log(`- Details Submitted: ${accountDetails.details_submitted}`)

      // Redirect to success page with account info
      const successUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe/callback`)
      successUrl.searchParams.set("success", "true")
      successUrl.searchParams.set("account_id", oauthData.stripe_user_id)
      successUrl.searchParams.set("charges_enabled", accountDetails.charges_enabled.toString())
      successUrl.searchParams.set("details_submitted", accountDetails.details_submitted.toString())
      
      return NextResponse.redirect(successUrl.toString())
      
    } catch (stripeError) {
      console.error("❌ Stripe Connect processing failed:", stripeError)
      
      let errorMessage = "connection_failed"
      if (stripeError instanceof Error) {
        errorMessage = stripeError.message
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=${encodeURIComponent(errorMessage)}`
      )
    }
    
  } catch (error) {
    console.error("❌ OAuth callback processing failed:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=callback_failed`
    )
  }
}
