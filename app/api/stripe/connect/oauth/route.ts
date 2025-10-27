import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate environment variables
    const clientId = process.env.STRIPE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'Stripe client ID not configured' }, { status: 500 })
    }

    // Generate OAuth URL with correct callback
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://massclip.pro'
    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: userId, // Pass user ID as state for security
    })

    const authUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating OAuth URL:', error)
    return NextResponse.json({ error: 'Failed to generate OAuth URL' }, { status: 500 })
  }
}
