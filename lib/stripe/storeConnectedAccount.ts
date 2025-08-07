import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface StripeOAuthData {
  stripe_user_id: string
  access_token: string
  refresh_token?: string
  livemode: boolean
  scope: string
  token_type?: string
}

export interface StripeAccountData {
  id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  email?: string
  business_type?: string
  default_currency: string
  type: string
  requirements?: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
    disabled_reason?: string
  }
  capabilities?: {
    card_payments?: string
    transfers?: string
  }
  business_profile?: {
    name?: string
    url?: string
  }
}

export interface ConnectedAccountRecord {
  // Core OAuth data
  userId: string
  stripe_user_id: string
  access_token: string
  refresh_token?: string
  livemode: boolean
  scope: string
  
  // Account status
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  
  // Account details
  country: string
  email?: string
  business_type?: string
  default_currency: string
  account_type: string
  
  // Requirements and capabilities
  requirements_currently_due: string[]
  requirements_past_due: string[]
  requirements_pending_verification: string[]
  disabled_reason?: string
  
  // Capabilities
  card_payments_capability?: string
  transfers_capability?: string
  
  // Business info
  business_name?: string
  business_url?: string
  
  // Platform metadata
  connected: boolean
  connectedAt: string
  lastUpdated: string
  lastSyncedAt?: string
}

/**
 * Validates that the OAuth data contains required fields
 */
function validateOAuthData(oauthData: any): StripeOAuthData {
  if (!oauthData || typeof oauthData !== 'object') {
    throw new Error('Invalid OAuth data: must be an object')
  }

  if (!oauthData.stripe_user_id || typeof oauthData.stripe_user_id !== 'string') {
    throw new Error('Invalid OAuth data: stripe_user_id is required and must be a string')
  }

  if (!oauthData.access_token || typeof oauthData.access_token !== 'string') {
    throw new Error('Invalid OAuth data: access_token is required and must be a string')
  }

  if (typeof oauthData.livemode !== 'boolean') {
    throw new Error('Invalid OAuth data: livemode must be a boolean')
  }

  if (!oauthData.scope || typeof oauthData.scope !== 'string') {
    throw new Error('Invalid OAuth data: scope is required and must be a string')
  }

  return {
    stripe_user_id: oauthData.stripe_user_id,
    access_token: oauthData.access_token,
    refresh_token: oauthData.refresh_token || undefined,
    livemode: oauthData.livemode,
    scope: oauthData.scope,
    token_type: oauthData.token_type || 'bearer'
  }
}

/**
 * Validates that the account data contains required fields
 */
function validateAccountData(accountData: any): StripeAccountData {
  if (!accountData || typeof accountData !== 'object') {
    throw new Error('Invalid account data: must be an object')
  }

  if (!accountData.id || typeof accountData.id !== 'string') {
    throw new Error('Invalid account data: id is required and must be a string')
  }

  if (typeof accountData.charges_enabled !== 'boolean') {
    throw new Error('Invalid account data: charges_enabled must be a boolean')
  }

  if (typeof accountData.payouts_enabled !== 'boolean') {
    throw new Error('Invalid account data: payouts_enabled must be a boolean')
  }

  if (typeof accountData.details_submitted !== 'boolean') {
    throw new Error('Invalid account data: details_submitted must be a boolean')
  }

  if (!accountData.country || typeof accountData.country !== 'string') {
    throw new Error('Invalid account data: country is required and must be a string')
  }

  return accountData as StripeAccountData
}

/**
 * Validates user ID
 */
function validateUserId(userId: any): string {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Invalid user ID: must be a non-empty string')
  }
  return userId.trim()
}

/**
 * Sanitizes and structures the data for Firestore storage
 */
function sanitizeConnectedAccountData(
  userId: string,
  oauthData: StripeOAuthData,
  accountData: StripeAccountData
): ConnectedAccountRecord {
  const now = new Date().toISOString()

  return {
    // Core OAuth data
    userId,
    stripe_user_id: oauthData.stripe_user_id,
    access_token: oauthData.access_token,
    refresh_token: oauthData.refresh_token,
    livemode: oauthData.livemode,
    scope: oauthData.scope,
    
    // Account status
    charges_enabled: accountData.charges_enabled,
    payouts_enabled: accountData.payouts_enabled,
    details_submitted: accountData.details_submitted,
    
    // Account details
    country: accountData.country,
    email: accountData.email,
    business_type: accountData.business_type,
    default_currency: accountData.default_currency || 'usd',
    account_type: accountData.type || 'standard',
    
    // Requirements and capabilities
    requirements_currently_due: accountData.requirements?.currently_due || [],
    requirements_past_due: accountData.requirements?.past_due || [],
    requirements_pending_verification: accountData.requirements?.pending_verification || [],
    disabled_reason: accountData.requirements?.disabled_reason,
    
    // Capabilities
    card_payments_capability: accountData.capabilities?.card_payments,
    transfers_capability: accountData.capabilities?.transfers,
    
    // Business info
    business_name: accountData.business_profile?.name,
    business_url: accountData.business_profile?.url,
    
    // Platform metadata
    connected: true,
    connectedAt: now,
    lastUpdated: now,
    lastSyncedAt: now
  }
}

/**
 * Main function to store connected Stripe account data
 */
export async function storeConnectedAccount(
  userId: any,
  oauthData: any,
  accountData: any,
  options: {
    updateUserRecord?: boolean
    firestoreInstance?: any
  } = {}
): Promise<ConnectedAccountRecord> {
  try {
    // Validate inputs
    const validUserId = validateUserId(userId)
    const validOAuthData = validateOAuthData(oauthData)
    const validAccountData = validateAccountData(accountData)

    // Use provided Firestore instance or default
    const firestoreDb = options.firestoreInstance || db

    if (!firestoreDb) {
      throw new Error('Firestore instance not available')
    }

    // Sanitize and structure the data
    const connectedAccountRecord = sanitizeConnectedAccountData(
      validUserId,
      validOAuthData,
      validAccountData
    )

    // Store in connectedStripeAccounts collection
    const accountRef = doc(firestoreDb, 'connectedStripeAccounts', validUserId)
    await setDoc(accountRef, connectedAccountRecord, { merge: true })

    // Optionally update user record with connection status
    if (options.updateUserRecord !== false) {
      try {
        const userRef = doc(firestoreDb, 'users', validUserId)
        await updateDoc(userRef, {
          stripeConnected: true,
          connectedAccountId: validOAuthData.stripe_user_id,
          stripeConnectionUpdatedAt: new Date().toISOString()
        })
      } catch (userUpdateError) {
        // Log but don't fail the main operation
        console.warn('Failed to update user record with Stripe connection status:', userUpdateError)
      }
    }

    console.log('✅ Successfully stored connected Stripe account:', {
      userId: validUserId,
      stripeAccountId: validOAuthData.stripe_user_id,
      livemode: validOAuthData.livemode
    })

    return connectedAccountRecord

  } catch (error) {
    console.error('❌ Failed to store connected Stripe account:', error)
    throw error
  }
}

/**
 * Helper function to update existing connected account data
 */
export async function updateConnectedAccount(
  userId: string,
  updates: Partial<ConnectedAccountRecord>,
  firestoreInstance?: any
): Promise<void> {
  try {
    const validUserId = validateUserId(userId)
    const firestoreDb = firestoreInstance || db

    if (!firestoreDb) {
      throw new Error('Firestore instance not available')
    }

    const accountRef = doc(firestoreDb, 'connectedStripeAccounts', validUserId)
    const updateData = {
      ...updates,
      lastUpdated: new Date().toISOString()
    }

    await updateDoc(accountRef, updateData)

    console.log('✅ Successfully updated connected Stripe account:', validUserId)

  } catch (error) {
    console.error('❌ Failed to update connected Stripe account:', error)
    throw error
  }
}

/**
 * Helper function to mark account as disconnected
 */
export async function markAccountDisconnected(
  userId: string,
  firestoreInstance?: any
): Promise<void> {
  try {
    await updateConnectedAccount(userId, {
      connected: false,
      access_token: '', // Clear sensitive data
      refresh_token: undefined,
      lastUpdated: new Date().toISOString()
    }, firestoreInstance)

    // Update user record
    const firestoreDb = firestoreInstance || db
    if (firestoreDb) {
      try {
        const userRef = doc(firestoreDb, 'users', userId)
        await updateDoc(userRef, {
          stripeConnected: false,
          connectedAccountId: null,
          stripeConnectionUpdatedAt: new Date().toISOString()
        })
      } catch (userUpdateError) {
        console.warn('Failed to update user record after disconnection:', userUpdateError)
      }
    }

    console.log('✅ Successfully marked Stripe account as disconnected:', userId)

  } catch (error) {
    console.error('❌ Failed to mark Stripe account as disconnected:', error)
    throw error
  }
}
