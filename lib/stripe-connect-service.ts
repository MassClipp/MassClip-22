import { adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export interface ConnectedStripeAccount {
  // OAuth tokens
  stripe_user_id: string
  access_token: string
  refresh_token: string
  livemode: boolean
  scope: string
  
  // Account metadata
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  email: string
  business_type: string
  type: string
  
  // Platform metadata
  userId: string
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
  
  // Additional Stripe metadata
  default_currency: string
  business_profile?: {
    name?: string
    url?: string
    support_email?: string
  }
  requirements?: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
}

/**
 * Generate Stripe Connect OAuth URL
 */
export function generateStripeConnectUrl(userId: string): string {
  const clientId = process.env.STRIPE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/oauth-callback`
  
  if (!clientId) {
    throw new Error("STRIPE_CLIENT_ID environment variable is required")
  }
  
  const state = encodeURIComponent(JSON.stringify({ userId }))
  
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state: state,
  })
  
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeOAuthCode(code: string): Promise<{
  stripe_user_id: string
  access_token: string
  refresh_token: string
  livemode: boolean
  scope: string
}> {
  const clientSecret = process.env.STRIPE_SECRET_KEY
  
  if (!clientSecret) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required")
  }
  
  console.log("🔄 Exchanging OAuth code for access token...")
  
  const response = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_secret: clientSecret,
      code: code,
      grant_type: "authorization_code",
    }).toString(),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error("❌ OAuth token exchange failed:", errorText)
    throw new Error(`OAuth token exchange failed: ${response.status} ${errorText}`)
  }
  
  const data = await response.json()
  console.log("✅ OAuth token exchange successful")
  
  return {
    stripe_user_id: data.stripe_user_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    livemode: data.livemode,
    scope: data.scope,
  }
}

/**
 * Get full Stripe account details
 */
export async function getStripeAccountDetails(accountId: string): Promise<Stripe.Account> {
  console.log(`🔄 Fetching Stripe account details for: ${accountId}`)
  
  try {
    const account = await stripe.accounts.retrieve(accountId)
    console.log("✅ Successfully retrieved Stripe account details")
    return account
  } catch (error) {
    console.error("❌ Failed to retrieve Stripe account details:", error)
    throw error
  }
}

/**
 * Save connected Stripe account to Firestore
 */
export async function saveConnectedAccount(
  userId: string,
  oauthData: {
    stripe_user_id: string
    access_token: string
    refresh_token: string
    livemode: boolean
    scope: string
  },
  accountDetails: Stripe.Account
): Promise<void> {
  console.log(`🔄 Saving connected Stripe account for user: ${userId}`)
  
  try {
    const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
    
    const accountData: Omit<ConnectedStripeAccount, 'createdAt' | 'updatedAt'> = {
      // OAuth tokens
      stripe_user_id: oauthData.stripe_user_id,
      access_token: oauthData.access_token,
      refresh_token: oauthData.refresh_token,
      livemode: oauthData.livemode,
      scope: oauthData.scope,
      
      // Account metadata
      charges_enabled: accountDetails.charges_enabled,
      payouts_enabled: accountDetails.payouts_enabled,
      details_submitted: accountDetails.details_submitted,
      country: accountDetails.country || "",
      email: accountDetails.email || "",
      business_type: accountDetails.business_type || "",
      type: accountDetails.type || "",
      default_currency: accountDetails.default_currency || "usd",
      
      // Platform metadata
      userId: userId,
      
      // Additional metadata
      business_profile: accountDetails.business_profile ? {
        name: accountDetails.business_profile.name || undefined,
        url: accountDetails.business_profile.url || undefined,
        support_email: accountDetails.business_profile.support_email || undefined,
      } : undefined,
      
      requirements: accountDetails.requirements ? {
        currently_due: accountDetails.requirements.currently_due || [],
        past_due: accountDetails.requirements.past_due || [],
        pending_verification: accountDetails.requirements.pending_verification || [],
      } : undefined,
    }
    
    // Check if document exists
    const docSnapshot = await docRef.get()
    
    if (docSnapshot.exists) {
      // Update existing document
      await docRef.update({
        ...accountData,
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log(`✅ Updated connected Stripe account for user: ${userId}`)
    } else {
      // Create new document
      await docRef.set({
        ...accountData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log(`✅ Created new connected Stripe account for user: ${userId}`)
    }
    
    // Also update the user's document for backward compatibility
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: oauthData.stripe_user_id,
      stripeAccountStatus: accountDetails.details_submitted ? "active" : "pending",
      stripeChargesEnabled: accountDetails.charges_enabled,
      stripePayoutsEnabled: accountDetails.payouts_enabled,
      stripeDetailsSubmitted: accountDetails.details_submitted,
      updatedAt: FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ Updated user document for backward compatibility: ${userId}`)
    
  } catch (error) {
    console.error(`❌ Failed to save connected Stripe account for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get connected Stripe account by user ID
 */
export async function getConnectedAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
    const docSnapshot = await docRef.get()
    
    if (!docSnapshot.exists) {
      return null
    }
    
    return docSnapshot.data() as ConnectedStripeAccount
  } catch (error) {
    console.error(`❌ Failed to get connected Stripe account for user ${userId}:`, error)
    throw error
  }
}

/**
 * Check if user has a connected and active Stripe account
 */
export async function hasActiveStripeAccount(userId: string): Promise<boolean> {
  try {
    const account = await getConnectedAccount(userId)
    
    if (!account) {
      return false
    }
    
    return account.charges_enabled && account.details_submitted
  } catch (error) {
    console.error(`❌ Failed to check Stripe account status for user ${userId}:`, error)
    return false
  }
}

/**
 * Refresh connected account data from Stripe
 */
export async function refreshConnectedAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    console.log(`🔄 Refreshing connected Stripe account for user: ${userId}`)
    
    const existingAccount = await getConnectedAccount(userId)
    if (!existingAccount) {
      console.log(`ℹ️ No connected account found for user: ${userId}`)
      return null
    }
    
    // Get fresh data from Stripe
    const accountDetails = await getStripeAccountDetails(existingAccount.stripe_user_id)
    
    // Update with fresh data
    await saveConnectedAccount(
      userId,
      {
        stripe_user_id: existingAccount.stripe_user_id,
        access_token: existingAccount.access_token,
        refresh_token: existingAccount.refresh_token,
        livemode: existingAccount.livemode,
        scope: existingAccount.scope,
      },
      accountDetails
    )
    
    // Return updated data
    return await getConnectedAccount(userId)
  } catch (error) {
    console.error(`❌ Failed to refresh connected account for user ${userId}:`, error)
    
    // If account doesn't exist in Stripe, clean up our records
    if (error instanceof Stripe.errors.StripeError && error.code === 'account_invalid') {
      console.log(`🧹 Cleaning up invalid Stripe account for user: ${userId}`)
      await adminDb.collection("connectedStripeAccounts").doc(userId).delete()
      return null
    }
    
    throw error
  }
}

/**
 * Delete connected account
 */
export async function deleteConnectedAccount(userId: string): Promise<void> {
  try {
    await adminDb.collection("connectedStripeAccounts").doc(userId).delete()
    
    // Also clean up user document
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: null,
      stripeAccountStatus: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      updatedAt: FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ Deleted connected Stripe account for user: ${userId}`)
  } catch (error) {
    console.error(`❌ Failed to delete connected account for user ${userId}:`, error)
    throw error
  }
}
