import { adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export interface ConnectedStripeAccount {
  stripeAccountId: string
  userId: string
  email: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}

/**
 * Save or update a connected Stripe account in Firestore
 */
export async function saveConnectedStripeAccount(
  userId: string,
  stripeAccount: Stripe.Account
): Promise<void> {
  try {
    console.log(`🔄 Saving connected Stripe account for user: ${userId}`)
    
    const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
    const docSnapshot = await docRef.get()
    
    const accountData = {
      stripeAccountId: stripeAccount.id,
      userId,
      email: stripeAccount.email || "",
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      updatedAt: FieldValue.serverTimestamp(),
    }
    
    if (docSnapshot.exists) {
      // Update existing document (preserve createdAt)
      await docRef.update(accountData)
      console.log(`✅ Updated connected Stripe account for user: ${userId}`)
    } else {
      // Create new document
      await docRef.set({
        ...accountData,
        createdAt: FieldValue.serverTimestamp(),
      })
      console.log(`✅ Created new connected Stripe account for user: ${userId}`)
    }
  } catch (error) {
    console.error(`❌ Failed to save connected Stripe account for user ${userId}:`, error)
    throw new Error(`Failed to save connected Stripe account: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a connected Stripe account from Firestore
 */
export async function getConnectedStripeAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    const docRef = adminDb.collection("connectedStripeAccounts").doc(userId)
    const docSnapshot = await docRef.get()
    
    if (!docSnapshot.exists) {
      return null
    }
    
    return docSnapshot.data() as ConnectedStripeAccount
  } catch (error) {
    console.error(`❌ Failed to get connected Stripe account for user ${userId}:`, error)
    throw new Error(`Failed to get connected Stripe account: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Update Stripe account status from live Stripe data
 */
export async function refreshStripeAccountStatus(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    console.log(`🔄 Refreshing Stripe account status for user: ${userId}`)
    
    // Get current account data from Firestore
    const currentAccount = await getConnectedStripeAccount(userId)
    if (!currentAccount) {
      console.log(`ℹ️ No connected Stripe account found for user: ${userId}`)
      return null
    }
    
    // Fetch fresh data from Stripe
    const stripeAccount = await stripe.accounts.retrieve(currentAccount.stripeAccountId)
    
    // Update with fresh data
    await saveConnectedStripeAccount(userId, stripeAccount)
    
    // Return updated data
    return await getConnectedStripeAccount(userId)
  } catch (error) {
    console.error(`❌ Failed to refresh Stripe account status for user ${userId}:`, error)
    
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
 * Delete a connected Stripe account record
 */
export async function deleteConnectedStripeAccount(userId: string): Promise<void> {
  try {
    await adminDb.collection("connectedStripeAccounts").doc(userId).delete()
    console.log(`✅ Deleted connected Stripe account for user: ${userId}`)
  } catch (error) {
    console.error(`❌ Failed to delete connected Stripe account for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get all connected Stripe accounts (for batch operations)
 */
export async function getAllConnectedStripeAccounts(): Promise<ConnectedStripeAccount[]> {
  try {
    const snapshot = await adminDb.collection("connectedStripeAccounts").get()
    return snapshot.docs.map(doc => doc.data() as ConnectedStripeAccount)
  } catch (error) {
    console.error("❌ Failed to get all connected Stripe accounts:", error)
    throw error
  }
}

/**
 * Batch refresh all connected Stripe accounts
 * This can be run manually or scheduled daily
 */
export async function batchRefreshStripeAccounts(): Promise<{
  processed: number
  updated: number
  errors: number
  incompleteAccounts: string[]
}> {
  console.log("🚀 Starting batch refresh of all Stripe accounts...")
  
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    incompleteAccounts: [] as string[],
  }
  
  try {
    const allAccounts = await getAllConnectedStripeAccounts()
    console.log(`📊 Found ${allAccounts.length} connected Stripe accounts to refresh`)
    
    for (const account of allAccounts) {
      results.processed++
      
      try {
        console.log(`🔄 Processing account ${results.processed}/${allAccounts.length}: ${account.userId}`)
        
        // Get fresh data from Stripe
        const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId)
        
        // Check if anything changed
        const hasChanges = 
          account.charges_enabled !== stripeAccount.charges_enabled ||
          account.payouts_enabled !== stripeAccount.payouts_enabled ||
          account.details_submitted !== stripeAccount.details_submitted ||
          account.email !== (stripeAccount.email || "")
        
        if (hasChanges) {
          await saveConnectedStripeAccount(account.userId, stripeAccount)
          results.updated++
          console.log(`✅ Updated account for user: ${account.userId}`)
        } else {
          console.log(`ℹ️ No changes for user: ${account.userId}`)
        }
        
        // Flag incomplete accounts
        if (!stripeAccount.details_submitted || !stripeAccount.charges_enabled) {
          results.incompleteAccounts.push(account.userId)
          console.log(`⚠️ Incomplete account flagged: ${account.userId}`)
        }
        
        // Rate limiting - don't hammer Stripe API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        results.errors++
        console.error(`❌ Error processing account for user ${account.userId}:`, error)
        
        // Clean up invalid accounts
        if (error instanceof Stripe.errors.StripeError && error.code === 'account_invalid') {
          console.log(`🧹 Cleaning up invalid account for user: ${account.userId}`)
          await deleteConnectedStripeAccount(account.userId)
        }
      }
    }
    
    console.log("✅ Batch refresh completed!")
    console.log(`📊 Results: ${results.processed} processed, ${results.updated} updated, ${results.errors} errors`)
    console.log(`⚠️ Incomplete accounts: ${results.incompleteAccounts.length}`)
    
    return results
    
  } catch (error) {
    console.error("❌ Batch refresh failed:", error)
    throw error
  }
}
