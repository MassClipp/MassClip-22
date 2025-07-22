import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // This contains the user ID
    const error = searchParams.get("error")

    console.log("🔧 [Stripe] OAuth callback received:", { code: !!code, state, error })

    if (error) {
      console.error("❌ [Stripe] OAuth error:", error)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=oauth_failed`)
    }

    if (!code || !state) {
      console.error("❌ [Stripe] Missing code or state parameter")
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=invalid_callback`)
    }

    const userId = state

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code: code,
    })

    const accountId = response.stripe_user_id
    console.log(`✅ [Stripe] Connected existing account: ${accountId} for user: ${userId}`)

    // Get account details to determine business type
    const account = await stripe.accounts.retrieve(accountId)
    const businessType = account.business_type || "individual"

    // Save account info to Firestore
    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .update({
          stripeAccountId: accountId,
          stripeAccountStatus: account.details_submitted ? "complete" : "pending",
          stripeAccountType: businessType,
          stripeConnectedAt: new Date(),
          updatedAt: new Date(),
        })
      console.log(`✅ [Stripe] Saved connected account info to Firestore for user: ${userId}`)
    } catch (firestoreError) {
      console.error("⚠️ [Stripe] Failed to save to Firestore:", firestoreError)
    }

    // Redirect to success page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
    return NextResponse.redirect(`${baseUrl}/dashboard/earnings?success=true&connected=true`)
  } catch (error) {
    console.error("❌ [Stripe] OAuth callback error:", error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
    return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=connection_failed`)
  }
}
