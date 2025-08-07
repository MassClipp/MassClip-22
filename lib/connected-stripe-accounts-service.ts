import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { db as adminDb } from '@/lib/firebase-admin'

export interface ConnectedStripeAccount {
  userId: string
  stripeAccountId: string
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
  email: string
  business_type?: string
  default_currency: string
  
  // Requirements
  requirements: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  
  // Metadata
  connected: boolean
  connectedAt: string
  lastUpdated: string
  
  // Full Stripe account data
  stripeAccountData?: any
}

// Server-side function for webhook processor (uses admin SDK)
export async function getConnectedStripeAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    if (!adminDb) {
      console.error('Firebase Admin not initialized')
      return null
    }
    
    const docRef = adminDb.collection('connectedStripeAccounts').doc(userId)
    const docSnap = await docRef.get()
    
    if (docSnap.exists) {
      const data = docSnap.data() as ConnectedStripeAccount
      // Ensure stripeAccountId is set from stripe_user_id if missing
      if (!data.stripeAccountId && data.stripe_user_id) {
        data.stripeAccountId = data.stripe_user_id
      }
      return data
    }
    
    return null
  } catch (error) {
    console.error('Error getting connected account (server):', error)
    return null
  }
}

export class ConnectedStripeAccountsService {
  
  static async getAccount(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      if (!db) throw new Error('Firestore not initialized')
      
      const docRef = doc(db, 'connectedStripeAccounts', userId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ConnectedStripeAccount
        // Ensure stripeAccountId is set from stripe_user_id if missing
        if (!data.stripeAccountId && data.stripe_user_id) {
          data.stripeAccountId = data.stripe_user_id
        }
        return data
      }
      
      return null
    } catch (error) {
      console.error('Error getting connected account:', error)
      return null
    }
  }
  
  static async saveAccount(userId: string, accountData: Partial<ConnectedStripeAccount>): Promise<boolean> {
    try {
      if (!db) throw new Error('Firestore not initialized')
      
      const docRef = doc(db, 'connectedStripeAccounts', userId)
      await setDoc(docRef, {
        ...accountData,
        userId,
        lastUpdated: new Date().toISOString(),
      }, { merge: true })
      
      return true
    } catch (error) {
      console.error('Error saving connected account:', error)
      return false
    }
  }
  
  static async updateAccount(userId: string, updates: Partial<ConnectedStripeAccount>): Promise<boolean> {
    try {
      if (!db) throw new Error('Firestore not initialized')
      
      const docRef = doc(db, 'connectedStripeAccounts', userId)
      await updateDoc(docRef, {
        ...updates,
        lastUpdated: new Date().toISOString(),
      })
      
      return true
    } catch (error) {
      console.error('Error updating connected account:', error)
      return false
    }
  }
  
  static async deleteAccount(userId: string): Promise<boolean> {
    try {
      if (!db) throw new Error('Firestore not initialized')
      
      const docRef = doc(db, 'connectedStripeAccounts', userId)
      await deleteDoc(docRef)
      
      return true
    } catch (error) {
      console.error('Error deleting connected account:', error)
      return false
    }
  }
  
  static async refreshAccountFromStripe(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      const account = await this.getAccount(userId)
      if (!account || !account.access_token) {
        return null
      }
      
      // Fetch fresh data from Stripe
      const response = await fetch(`https://api.stripe.com/v1/accounts/${account.stripe_user_id}`, {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Stripe-Version': '2023-10-16',
        },
      })
      
      if (!response.ok) {
        console.error('Failed to refresh account from Stripe')
        return account
      }
      
      const stripeData = await response.json()
      
      // Update account with fresh data
      const updatedAccount: Partial<ConnectedStripeAccount> = {
        charges_enabled: stripeData.charges_enabled || false,
        payouts_enabled: stripeData.payouts_enabled || false,
        details_submitted: stripeData.details_submitted || false,
        country: stripeData.country || account.country,
        email: stripeData.email || account.email,
        business_type: stripeData.business_type || account.business_type,
        default_currency: stripeData.default_currency || account.default_currency,
        requirements: {
          currently_due: stripeData.requirements?.currently_due || [],
          past_due: stripeData.requirements?.past_due || [],
          pending_verification: stripeData.requirements?.pending_verification || [],
        },
        stripeAccountData: stripeData,
      }
      
      await this.updateAccount(userId, updatedAccount)
      
      return { ...account, ...updatedAccount } as ConnectedStripeAccount
    } catch (error) {
      console.error('Error refreshing account from Stripe:', error)
      return null
    }
  }
  
  static isAccountFullySetup(account: ConnectedStripeAccount): boolean {
    return account.charges_enabled && 
           account.payouts_enabled && 
           account.details_submitted &&
           account.requirements.currently_due.length === 0 &&
           account.requirements.past_due.length === 0
  }
}
