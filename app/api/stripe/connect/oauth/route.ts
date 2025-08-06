import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔄 [OAuth Init] Generating OAuth URL for user: ${userId}`)

    const clientId = process.env.STRIPE_CLIENT_ID
    if (!clientId) {
      console.error("❌ [OAuth Init] Missing STRIPE_CLIENT_ID")
      return NextResponse.json({ error: "Stripe client ID not configured" }, { status: 500 })
    }

    // Use our new callback route
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/callback`
    
    // Encode user ID in state parameter
    const state = encodeURIComponent(JSON.stringify({ userId }))
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state: state,
    })
    
    const authUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
    
    console.log(`✅ [OAuth Init] Generated OAuth URL for user: ${userId}`)
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("❌ [OAuth Init] Error generating OAuth URL:", error)
    return NextResponse.json({ error: "Failed to generate OAuth URL" }, { status: 500 })
  }
}
