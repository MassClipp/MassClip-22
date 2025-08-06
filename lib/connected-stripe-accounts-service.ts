import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export interface ConnectedStripeAccount {
  // OAuth tokens and metadata
  stripe_user_id: string
  access_token: string
  refresh_token?: string | null
  livemode: boolean
  scope: string
  
  // Account status and capabilities
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  
  // Account metadata
  country?: string | null
  email?: string | null
  business_type?: string | null
  type?: string | null
  default_currency: string
  
  // Platform metadata
  userId: string
  connected: boolean
  connectedAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
  
  // Additional metadata
  business_profile?: {
    name?: string | null
    url?: string | null
    support_email?: string | null
  } | null
  
  requirements?: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
    eventually_due: string[]
  } | null
  
  stripe_account_data?: any
}

/**
 * Get connected Stripe account by user ID
 */
export async function getConnectedStripeAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    console.log(`🔍 [Connected Accounts] Getting account for user: ${userId}`)
    
    const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
    const docSnapshot = await docRef.get()
    
    if (!docSnapshot.exists) {
      console.log(`ℹ️ [Connected Accounts] No connected account found for user: ${userId}`)
      return null
    }
    
    const data = docSnapshot.data() as ConnectedStripeAccount
    console.log(`✅ [Connected Accounts] Found connected account: ${data.stripe_user_id}`)
    
    return data
  } catch (error) {
    console.error(`❌ [Connected Accounts] Error getting account for user ${userId}:`, error)
    throw error
  }
}

/**
 * Check if user has a connected and active Stripe account
 */
export async function hasActiveStripeAccount(userId: string): Promise<boolean> {
  try {
    const account = await getConnectedStripeAccount(userId)
    
    if (!account || !account.connected) {
      return false
    }
    
    // Account is active if charges are enabled and details are submitted
    return account.charges_enabled && account.details_submitted
  } catch (error) {
    console.error(`❌ [Connected Accounts] Error checking active status for user ${userId}:`, error)
    return false
  }
}

/**
 * Update connected account data (for refreshing from Stripe)
 */
export async function updateConnectedStripeAccount(
  userId: string, 
  updateData: Partial<ConnectedStripeAccount>
): Promise<void> {
  try {
    console.log(`🔄 [Connected Accounts] Updating account for user: ${userId}`)
    
    const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
    
    await docRef.update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ [Connected Accounts] Updated account for user: ${userId}`)
  } catch (error) {
    console.error(`❌ [Connected Accounts] Error updating account for user ${userId}:`, error)
    throw error
  }
}

/**
 * Delete connected account
 */
export async function deleteConnectedStripeAccount(userId: string): Promise<void> {
  try {
    console.log(`🗑️ [Connected Accounts] Deleting account for user: ${userId}`)
    
    await adminDb.collection("connectedStripeAccounts").doc(userId).delete()
    
    console.log(`✅ [Connected Accounts] Deleted account for user: ${userId}`)
  } catch (error) {
    console.error(`❌ [Connected Accounts] Error deleting account for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get all connected accounts (for admin purposes)
 */
export async function getAllConnectedAccounts(): Promise<ConnectedStripeAccount[]> {
  try {
    console.log("🔍 [Connected Accounts] Getting all connected accounts")
    
    const snapshot = await adminDb.collection("connectedStripeAccounts").get()
    
    const accounts: ConnectedStripeAccount[] = []
    snapshot.forEach((doc) => {
      accounts.push(doc.data() as ConnectedStripeAccount)
    })
    
    console.log(`✅ [Connected Accounts] Found ${accounts.length} connected accounts`)
    return accounts
  } catch (error) {
    console.error("❌ [Connected Accounts] Error getting all accounts:", error)
    throw error
  }
}

/**
 * Refresh account data from Stripe
 */
export async function refreshStripeAccountData(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    console.log(`🔄 [Connected Accounts] Refreshing Stripe data for user: ${userId}`)
    
    const existingAccount = await getConnectedStripeAccount(userId)
    if (!existingAccount) {
      console.log(`ℹ️ [Connected Accounts] No existing account to refresh for user: ${userId}`)
      return null
    }
    
    // Get fresh data from Stripe
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    const accountDetails = await stripe.accounts.retrieve(existingAccount.stripe_user_id)
    
    // Update with fresh data
    const updateData: Partial<ConnectedStripeAccount> = {
      charges_enabled: accountDetails.charges_enabled || false,
      payouts_enabled: accountDetails.payouts_enabled || false,
      details_submitted: accountDetails.details_submitted || false,
      country: accountDetails.country || null,
      email: accountDetails.email || null,
      business_type: accountDetails.business_type || null,
      type: accountDetails.type || null,
      default_currency: accountDetails.default_currency || "usd",
      
      business_profile: accountDetails.business_profile ? {
        name: accountDetails.business_profile.name || null,
        url: accountDetails.business_profile.url || null,
        support_email: accountDetails.business_profile.support_email || null,
      } : null,
      
      requirements: accountDetails.requirements ? {
        currently_due: accountDetails.requirements.currently_due || [],
        past_due: accountDetails.requirements.past_due || [],
        pending_verification: accountDetails.requirements.pending_verification || [],
        eventually_due: accountDetails.requirements.eventually_due || [],
      } : null,
      
      stripe_account_data: {
        id: accountDetails.id,
        object: accountDetails.object,
        business_type: accountDetails.business_type,
        capabilities: accountDetails.capabilities,
        charges_enabled: accountDetails.charges_enabled,
        country: accountDetails.country,
        created: accountDetails.created,
        default_currency: accountDetails.default_currency,
        details_submitted: accountDetails.details_submitted,
        email: accountDetails.email,
        payouts_enabled: accountDetails.payouts_enabled,
        type: accountDetails.type,
      },
    }
    
    await updateConnectedStripeAccount(userId, updateData)
    
    // Return updated account
    return await getConnectedStripeAccount(userId)
  } catch (error) {
    console.error(`❌ [Connected Accounts] Error refreshing account for user ${userId}:`, error)
    throw error
  }
}
