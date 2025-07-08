import { type NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("account")

    if (!accountId) {
      return NextResponse.redirect("/stripe-test-connect?error=missing_account")
    }

    // Only allow in test mode
    if (!STRIPE_CONFIG.isTestMode) {
      return NextResponse.redirect("/stripe-test-connect?error=not_test_mode")
    }

    try {
      // Verify the account exists and get its details
      const account = await stripe.accounts.retrieve(accountId)

      console.log("✅ Stripe onboarding completed for account:", {
        id: account.id,
        email: account.email,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      })

      // In a real app, you would save this to your database
      // For this test, log instructions for manual setup
      console.log("💡 Manual setup required:")
      console.log("Add this to your environment variables:")
      console.log(`STRIPE_TEST_CONNECTED_ACCOUNT_ID=${account.id}`)

      return NextResponse.redirect("/stripe-test-connect?success=true")
    } catch (stripeError) {
      console.error("Failed to verify account:", stripeError)
      return NextResponse.redirect("/stripe-test-connect?error=verification_failed")
    }
  } catch (error) {
    console.error("Success handler failed:", error)
    return NextResponse.redirect("/stripe-test-connect?error=unknown")
  }
}
