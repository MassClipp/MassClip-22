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

    console.log("📥 Callback parameters:", { code: !!code, state, error, errorDescription })

    // Handle OAuth errors
    if (error) {
      console.error("❌ OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard/connect-stripe?error=${error}&description=${encodeURIComponent(errorDescription || "")}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("❌ Missing required parameters")
      return NextResponse.redirect(
        new URL("/dashboard/connect-stripe?error=missing_parameters", request.url)
      )
    }

    // Verify state parameter
    const stateDoc = await adminDb.collection("stripe_oauth_states").doc(state).get()
    if (!stateDoc.exists) {
      console.error("❌ Invalid state parameter")
      return NextResponse.redirect(
        new URL("/dashboard/connect-stripe?error=invalid_state", request.url)
      )
    }

    const stateData = stateDoc.data()!
    const userId = stateData.userId

    // Check if state has expired
    if (stateData.expiresAt.toDate() < new Date()) {
      console.error("❌ State parameter expired")
      await adminDb.collection("stripe_oauth_states").doc(state).delete()
      return NextResponse.redirect(
        new URL("/dashboard/connect-stripe?error=expired_state", request.url)
      )
    }

    console.log("👤 State verified for user:", userId)

    // Exchange authorization code for access token
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    console.log("🔑 Token exchange successful:", { accountId: tokenResponse.stripe_user_id })

    const accountId = tokenResponse.stripe_user_id
    if (!accountId) {
      console.error("❌ No account ID received from Stripe")
      return NextResponse.redirect(
        new URL("/dashboard/connect-stripe?error=no_account_id", request.url)
      )
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)
    console.log("📊 Account details retrieved:", {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })

    // Update user profile in Firestore
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: accountId,
      stripeConnected: true,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      stripeEmail: account.email,
      updatedAt: new Date(),
    })

    console.log("✅ User profile updated successfully")

    // Clean up state document
    await adminDb.collection("stripe_oauth_states").doc(state).delete()

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/dashboard/connect-stripe?success=true&account_id=${accountId}`, request.url)
    )
  } catch (error: any) {
    console.error("❌ OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/dashboard/connect-stripe?error=callback_failed", request.url)
    )
  }
}
