export interface ConnectedAccount {
  id: string
  email?: string
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  business_profile?: {
    name?: string
    url?: string
  }
  created: number
  country: string
  default_currency: string
}

export async function generateStripeConnectUrl(userId: string, returnUrl?: string): Promise<string> {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    // Generate OAuth URL for account linking
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`
    
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?` + new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CLIENT_ID!,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: JSON.stringify({ 
        userId, 
        returnUrl: returnUrl || '/dashboard/earnings'
      })
    }).toString()

    return oauthUrl
  } catch (error) {
    console.error('Error generating Stripe Connect URL:', error)
    throw new Error('Failed to generate Stripe Connect URL')
  }
}

export async function getConnectedAccount(userId: string): Promise<ConnectedAccount | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    // This will be called via API route that has access to Firebase Admin
    const response = await fetch('/api/stripe/connect/account-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching connected account:', error)
    return null
  }
}

export async function refreshConnectedAccount(userId: string): Promise<ConnectedAccount | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    // This will be called via API route that has access to Firebase Admin
    const response = await fetch('/api/stripe/connect/refresh-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error refreshing connected account:', error)
    throw new Error('Failed to refresh account status')
  }
}
