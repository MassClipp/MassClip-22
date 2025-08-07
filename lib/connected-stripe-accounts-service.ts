import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export interface ConnectedStripeAccount {
  stripeAccountId: string
  email: string
  country: string
  default_currency: string
  type: string
  business_type?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
    disabled_reason?: string
  }
  capabilities: {
    card_payments?: string
    transfers?: string
  }
  business_profile?: {
    name?: string
    url?: string
    support_email?: string
  }
  settings?: {
    payouts?: {
      schedule?: {
        interval: string
        delay_days: number
      }
    }
  }
  created: number
  updated: number
  lastSyncedAt: number
}

export class ConnectedStripeAccountsService {
  static async saveConnectedAccount(userId: string, stripeAccount: Stripe.Account): Promise<void> {
    try {
      console.log(`💾 Saving connected account for user ${userId}:`, {
        accountId: stripeAccount.id,
        email: stripeAccount.email,
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled
      })

      const accountData: ConnectedStripeAccount = {
        stripeAccountId: stripeAccount.id,
        email: stripeAccount.email || "",
        country: stripeAccount.country || "",
        default_currency: stripeAccount.default_currency || "usd",
        type: stripeAccount.type || "express",
        business_type: stripeAccount.business_type || undefined,
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        details_submitted: stripeAccount.details_submitted || false,
        requirements: {
          currently_due: stripeAccount.requirements?.currently_due || [],
          eventually_due: stripeAccount.requirements?.eventually_due || [],
          past_due: stripeAccount.requirements?.past_due || [],
          pending_verification: stripeAccount.requirements?.pending_verification || [],
          disabled_reason: stripeAccount.requirements?.disabled_reason || undefined,
        },
        capabilities: {
          card_payments: stripeAccount.capabilities?.card_payments || "inactive",
          transfers: stripeAccount.capabilities?.transfers || "inactive",
        },
        business_profile: {
          name: stripeAccount.business_profile?.name || undefined,
          url: stripeAccount.business_profile?.url || undefined,
          support_email: stripeAccount.business_profile?.support_email || undefined,
        },
        settings: {
          payouts: {
            schedule: {
              interval: stripeAccount.settings?.payouts?.schedule?.interval || "daily",
              delay_days: stripeAccount.settings?.payouts?.schedule?.delay_days || 2,
            },
          },
        },
        created: stripeAccount.created,
        updated: Date.now(),
        lastSyncedAt: Date.now(),
      }

      await db.collection("connectedStripeAccounts").doc(userId).set(accountData, { merge: true })

      console.log(`✅ Connected account saved successfully for user ${userId}`)
    } catch (error) {
      console.error(`❌ Error saving connected account for user ${userId}:`, error)
      throw error
    }
  }

  static async getConnectedAccount(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      const doc = await db.collection("connectedStripeAccounts").doc(userId).get()
      
      if (!doc.exists) {
        console.log(`ℹ️ No connected account found for user ${userId}`)
        return null
      }

      const data = doc.data() as ConnectedStripeAccount
      console.log(`✅ Found connected account for user ${userId}:`, {
        accountId: data.stripeAccountId,
        email: data.email,
        chargesEnabled: data.charges_enabled,
        payoutsEnabled: data.payouts_enabled
      })

      return data
    } catch (error) {
      console.error(`❌ Error getting connected account for user ${userId}:`, error)
      throw error
    }
  }

  static async refreshAccountFromStripe(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      const existingAccount = await this.getConnectedAccount(userId)
      
      if (!existingAccount) {
        console.log(`ℹ️ No existing account to refresh for user ${userId}`)
        return null
      }

      console.log(`🔄 Refreshing account from Stripe for user ${userId}`)
      
      const stripeAccount = await stripe.accounts.retrieve(existingAccount.stripeAccountId)
      await this.saveConnectedAccount(userId, stripeAccount)
      
      return await this.getConnectedAccount(userId)
    } catch (error) {
      console.error(`❌ Error refreshing account for user ${userId}:`, error)
      throw error
    }
  }

  static async deleteConnectedAccount(userId: string): Promise<void> {
    try {
      await db.collection("connectedStripeAccounts").doc(userId).delete()
      console.log(`✅ Connected account deleted for user ${userId}`)
    } catch (error) {
      console.error(`❌ Error deleting connected account for user ${userId}:`, error)
      throw error
    }
  }

  static async getAllConnectedAccounts(): Promise<{ userId: string; account: ConnectedStripeAccount }[]> {
    try {
      const snapshot = await db.collection("connectedStripeAccounts").get()
      const accounts: { userId: string; account: ConnectedStripeAccount }[] = []

      snapshot.forEach((doc) => {
        accounts.push({
          userId: doc.id,
          account: doc.data() as ConnectedStripeAccount,
        })
      })

      console.log(`✅ Retrieved ${accounts.length} connected accounts`)
      return accounts
    } catch (error) {
      console.error(`❌ Error getting all connected accounts:`, error)
      throw error
    }
  }
}

// Export the function that the webhook processor needs
export async function getConnectedStripeAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  return ConnectedStripeAccountsService.getConnectedAccount(userId)
}

// Export the class for other uses
export default ConnectedStripeAccountsService
