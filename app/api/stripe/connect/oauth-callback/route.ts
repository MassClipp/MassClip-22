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
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
      return NextResponse.redirect(
        `${baseUrl}/dashboard/connect-stripe?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || "")}`,
      )
    }

    if (!code || !state) {
      console.error("❌ Missing required parameters")
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=missing_parameters`)
    }

    // Verify state parameter
    console.log("🔐 Verifying state parameter...")
    const stateDoc = await adminDb.collection("stripe_oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.error("❌ Invalid state parameter")
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=invalid_state`)
    }

    const stateData = stateDoc.data()!
    const userId = stateData.userId

    // Check if state has expired
    if (new Date() > stateData.expiresAt.toDate()) {
      console.error("❌ State parameter expired")
      await adminDb.collection("stripe_oauth_states").doc(state).delete()
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=expired_state`)
    }

    console.log("✅ State verified for user:", userId)

    // Exchange authorization code for access token
    console.log("🔄 Exchanging code for access token...")
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    console.log("✅ Token exchange successful:", {
      accountId: tokenResponse.stripe_user_id,
      scope: tokenResponse.scope,
    })

    const stripeAccountId = tokenResponse.stripe_user_id

    // Get account details
    console.log("📊 Fetching account details...")
    const account = await stripe.accounts.retrieve(stripeAccountId)

    console.log("📋 Account details:", {
      id: account.id,
      email: account.email,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })

    // Update user profile in Firestore
    console.log("💾 Updating user profile...")
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId,
      stripeConnected: true,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      stripeConnectedAt: new Date(),
      updatedAt: new Date(),
    })

    // Clean up state document
    await adminDb.collection("stripe_oauth_states").doc(state).delete()
    console.log("🧹 Cleaned up state document")

    // Redirect to success page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
    const redirectUrl = `${baseUrl}/dashboard/connect-stripe?success=true&account_id=${stripeAccountId}`

    console.log("✅ OAuth callback completed successfully, redirecting to:", redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("❌ Error in OAuth callback:", error)

    // Clean up state if it exists
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state")
    if (state) {
      try {
        await adminDb.collection("stripe_oauth_states").doc(state).delete()
      } catch (cleanupError) {
        console.error("❌ Error cleaning up state:", cleanupError)
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
    return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=callback_failed`)
  }
}
