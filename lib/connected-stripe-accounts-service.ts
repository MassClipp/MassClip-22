import { db } from "@/lib/firebase-admin"

export interface ConnectedStripeAccount {
  stripeAccountId: string
  stripe_user_id: string
  email: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  default_currency: string
  type: string
  business_type?: string
  company?: any
  individual?: any
  requirements?: any
  capabilities?: any
  created: number
  updated: number
}

export class ConnectedStripeAccountsService {
  static async getAccount(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      const doc = await db.collection("connectedStripeAccounts").doc(userId).get()
      if (!doc.exists) {
        return null
      }
      return doc.data() as ConnectedStripeAccount
    } catch (error) {
      console.error("Error fetching connected account:", error)
      return null
    }
  }

  static async saveAccount(userId: string, accountData: Partial<ConnectedStripeAccount>): Promise<void> {
    try {
      await db.collection("connectedStripeAccounts").doc(userId).set(accountData, { merge: true })
    } catch (error) {
      console.error("Error saving connected account:", error)
      throw error
    }
  }

  static async deleteAccount(userId: string): Promise<void> {
    try {
      await db.collection("connectedStripeAccounts").doc(userId).delete()
    } catch (error) {
      console.error("Error deleting connected account:", error)
      throw error
    }
  }

  static async listAccounts(): Promise<{ userId: string; account: ConnectedStripeAccount }[]> {
    try {
      const snapshot = await db.collection("connectedStripeAccounts").get()
      return snapshot.docs.map(doc => ({
        userId: doc.id,
        account: doc.data() as ConnectedStripeAccount
      }))
    } catch (error) {
      console.error("Error listing connected accounts:", error)
      return []
    }
  }
}

// Export the function that the webhook processor needs
export async function getConnectedStripeAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  try {
    const doc = await db.collection("connectedStripeAccounts").doc(userId).get()
    if (!doc.exists) {
      console.log(`No connected Stripe account found for user: ${userId}`)
      return null
    }
    
    const accountData = doc.data() as ConnectedStripeAccount
    console.log(`Found connected Stripe account for user ${userId}:`, {
      stripeAccountId: accountData.stripeAccountId || accountData.stripe_user_id,
      charges_enabled: accountData.charges_enabled,
      details_submitted: accountData.details_submitted
    })
    
    return accountData
  } catch (error) {
    console.error(`Error fetching connected account for user ${userId}:`, error)
    return null
  }
}
