import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Stripe OAuth] Generating OAuth URL...")

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request.headers)
    const userId = authUser.uid

    const { returnUrl } = await request.json()

    console.log(`🔄 [Stripe OAuth] Generating OAuth URL for user: ${userId}`)

    // Generate Stripe Connect OAuth URL
    const clientId = process.env.STRIPE_CLIENT_ID
    if (!clientId) {
      throw new Error("STRIPE_CLIENT_ID environment variable is not set")
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
    const redirectUri = `${baseUrl}/api/stripe/connect-callback`
    
    const state = Buffer.from(JSON.stringify({
      userId,
      returnUrl: returnUrl || '/dashboard/earnings?onboarding=success'
    })).toString('base64')

    const authUrl = new URL('https://connect.stripe.com/oauth/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', 'read_write')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    console.log(`✅ [Stripe OAuth] Generated OAuth URL successfully`)

    return NextResponse.json({
      authUrl: authUrl.toString(),
      message: "OAuth URL generated successfully"
    })

  } catch (error: any) {
    console.error("❌ [Stripe OAuth] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate OAuth URL" },
      { status: 500 }
    )
  }
}
