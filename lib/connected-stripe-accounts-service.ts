import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

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
  livemode?: boolean
  connectedAt?: any
  lastUpdated?: any
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
      return snapshot.docs.map((doc) => ({
        userId: doc.id,
        account: doc.data() as ConnectedStripeAccount,
      }))
    } catch (error) {
      console.error("Error listing connected accounts:", error)
      return []
    }
  }

  static async refreshAccountFromStripe(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      console.log(`🔄 Refreshing Stripe account status for user: ${userId}`)

      // Get current account data from Firestore
      const currentAccount = await this.getAccount(userId)
      if (!currentAccount) {
        console.log(`ℹ️ No connected Stripe account found for user: ${userId}`)
        return null
      }

      // Fetch fresh data from Stripe using either field name
      const stripeAccountId = currentAccount.stripeAccountId || currentAccount.stripe_user_id
      const stripeAccount = await stripe.accounts.retrieve(stripeAccountId)

      // Update with fresh data
      const updatedAccountData: Partial<ConnectedStripeAccount> = {
        stripeAccountId: stripeAccount.id,
        stripe_user_id: stripeAccount.id,
        email: stripeAccount.email || currentAccount.email,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        country: stripeAccount.country || currentAccount.country,
        default_currency: stripeAccount.default_currency || currentAccount.default_currency,
        type: stripeAccount.type || currentAccount.type,
        business_type: stripeAccount.business_type || currentAccount.business_type,
        requirements: stripeAccount.requirements,
        capabilities: stripeAccount.capabilities,
        updated: Date.now(),
        lastUpdated: new Date().toISOString(),
      }

      await this.saveAccount(userId, updatedAccountData)

      // Return updated data
      return await this.getAccount(userId)
    } catch (error) {
      console.error(`❌ Failed to refresh Stripe account status for user ${userId}:`, error)

      // If account doesn't exist in Stripe, clean up our records
      if (error instanceof Stripe.errors.StripeError && error.code === "account_invalid") {
        console.log(`🧹 Cleaning up invalid Stripe account for user: ${userId}`)
        await this.deleteAccount(userId)
        return null
      }

      throw error
    }
  }

  static isAccountFullySetup(account: ConnectedStripeAccount): boolean {
    return account.charges_enabled && account.details_submitted
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
      details_submitted: accountData.details_submitted,
    })

    return accountData
  } catch (error) {
    console.error(`Error fetching connected account for user ${userId}:`, error)
    return null
  }
}
