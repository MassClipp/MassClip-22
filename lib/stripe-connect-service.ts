import { db } from '@/lib/firebase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

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

    // Check if user already has a connected account
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    let accountId = userData?.stripeAccountId

    // Create new account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        metadata: {
          userId: userId,
          created_via: 'connect_onboarding'
        }
      })
      
      accountId = account.id

      // Save account ID to user document
      await db.collection('users').doc(userId).update({
        stripeAccountId: accountId,
        stripeAccountCreated: new Date().toISOString()
      })
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
        accountId,
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

    // Get user's Stripe account ID from Firestore
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const accountId = userData?.stripeAccountId

    if (!accountId) {
      return null
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    return {
      id: account.id,
      email: account.email || undefined,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements ? {
        currently_due: account.requirements.currently_due || [],
        eventually_due: account.requirements.eventually_due || [],
        past_due: account.requirements.past_due || [],
        pending_verification: account.requirements.pending_verification || []
      } : undefined,
      business_profile: account.business_profile ? {
        name: account.business_profile.name || undefined,
        url: account.business_profile.url || undefined
      } : undefined,
      created: account.created,
      country: account.country || 'US',
      default_currency: account.default_currency || 'usd'
    }
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

    // Get fresh account data from Stripe
    const account = await getConnectedAccount(userId)
    
    if (!account) {
      return null
    }

    // Update user document with latest account status
    await db.collection('users').doc(userId).update({
      stripeAccountStatus: {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        last_updated: new Date().toISOString()
      }
    })

    return account
  } catch (error) {
    console.error('Error refreshing connected account:', error)
    throw new Error('Failed to refresh account status')
  }
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return accountLink.url
  } catch (error) {
    console.error('Error creating account link:', error)
    throw new Error('Failed to create account link')
  }
}

export async function disconnectAccount(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const accountId = userData?.stripeAccountId

    if (accountId) {
      // Delete the account from Stripe
      await stripe.accounts.del(accountId)
    }

    // Remove Stripe data from user document
    await db.collection('users').doc(userId).update({
      stripeAccountId: null,
      stripeAccountStatus: null,
      stripeAccountCreated: null
    })

    return true
  } catch (error) {
    console.error('Error disconnecting account:', error)
    return false
  }
}
