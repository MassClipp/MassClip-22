import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // This is the userId
    const error = searchParams.get("error")

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"

    if (error) {
      console.error("❌ Stripe OAuth error:", error)
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=oauth_failed`)
    }

    if (!code || !state) {
      console.error("❌ Missing code or state in OAuth callback")
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=invalid_callback`)
    }

    const userId = state

    console.log(`🔧 Processing OAuth callback for user: ${userId}`)

    // Exchange the authorization code for an access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const accountId = response.stripe_user_id

    if (!accountId) {
      console.error("❌ No account ID received from Stripe OAuth")
      return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=no_account`)
    }

    console.log(`✅ Connected existing Stripe account: ${accountId}`)

    // Save the account ID to the user's profile
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: accountId,
      stripeAccountStatus: "connected",
      stripeAccessToken: response.access_token,
      stripeRefreshToken: response.refresh_token,
      updatedAt: new Date(),
    })

    // Redirect to success page
    return NextResponse.redirect(`${baseUrl}/dashboard/earnings?success=true&connected=existing`)
  } catch (error: any) {
    console.error("❌ Failed to process OAuth callback:", error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
    return NextResponse.redirect(`${baseUrl}/dashboard/earnings?error=callback_failed`)
  }
}
