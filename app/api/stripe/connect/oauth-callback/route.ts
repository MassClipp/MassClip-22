import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔧 [OAuth Callback] Processing Stripe Connect OAuth callback...")

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log(`📥 [OAuth Callback] Received params:`, {
      code: code ? `${code.substring(0, 20)}...` : null,
      state,
      error,
      errorDescription,
    })

    // Handle OAuth errors
    if (error) {
      console.error(`❌ [OAuth Callback] OAuth error: ${error} - ${errorDescription}`)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      console.error("❌ [OAuth Callback] Missing code or state parameter")
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=missing_parameters`)
    }

    // Verify the state parameter
    const stateDoc = await db.firestore().collection("stripe_oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.error("❌ [OAuth Callback] Invalid or expired state parameter")
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=invalid_state`)
    }

    const stateData = stateDoc.data()!
    const userId = stateData.userId

    console.log(`👤 [OAuth Callback] Verified user: ${userId}`)

    // Clean up the state document
    await stateDoc.ref.delete()

    // Get the Stripe Connect client ID
    const clientId = process.env.STRIPE_CLIENT_ID

    if (!clientId) {
      console.error("❌ [OAuth Callback] STRIPE_CLIENT_ID not configured")
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
      return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=not_configured`)
    }

    // Exchange the authorization code for access token
    console.log("🔄 [OAuth Callback] Exchanging code for access token...")

    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
    })

    console.log(`✅ [OAuth Callback] Token exchange successful for account: ${tokenResponse.stripe_user_id}`)

    // Store the connection in Firestore
    await db.firestore().collection("users").doc(userId).update({
      stripeAccountId: tokenResponse.stripe_user_id,
      stripeConnected: true,
      stripeConnectedAt: new Date(),
      stripeAccessToken: tokenResponse.access_token,
      stripeRefreshToken: tokenResponse.refresh_token,
      stripeLivemode: tokenResponse.livemode,
      stripeScope: tokenResponse.scope,
    })

    console.log(`💾 [OAuth Callback] Stored connection data for user ${userId}`)

    // Redirect to success page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?success=true`)
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Error processing callback:", error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()
    return NextResponse.redirect(`${baseUrl}/dashboard/connect-stripe?error=callback_failed`)
  }
}
