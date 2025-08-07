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
        monthly_anchor?: number
        weekly_anchor?: string
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
        business_profile: stripeAccount.business_profile ? {
          name: stripeAccount.business_profile.name || undefined,
          url: stripeAccount.business_profile.url || undefined,
          support_email: stripeAccount.business_profile.support_email || undefined,
        } : undefined,
        settings: stripeAccount.settings ? {
          payouts: stripeAccount.settings.payouts ? {
            schedule: stripeAccount.settings.payouts.schedule ? {
              interval: stripeAccount.settings.payouts.schedule.interval,
              monthly_anchor: stripeAccount.settings.payouts.schedule.monthly_anchor || undefined,
              weekly_anchor: stripeAccount.settings.payouts.schedule.weekly_anchor || undefined,
            } : undefined,
          } : undefined,
        } : undefined,
        created: stripeAccount.created,
        updated: Date.now(),
        lastSyncedAt: Date.now(),
      }

      await db.collection("connectedStripeAccounts").doc(userId).set(accountData, { merge: true })
      console.log(`✅ Connected Stripe account saved for user: ${userId}`)
    } catch (error) {
      console.error("❌ Error saving connected Stripe account:", error)
      throw error
    }
  }

  static async getConnectedAccount(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      const doc = await db.collection("connectedStripeAccounts").doc(userId).get()
      if (!doc.exists) {
        return null
      }
      return doc.data() as ConnectedStripeAccount
    } catch (error) {
      console.error("❌ Error getting connected Stripe account:", error)
      throw error
    }
  }

  static async refreshAccountFromStripe(userId: string): Promise<ConnectedStripeAccount | null> {
    try {
      const existingAccount = await this.getConnectedAccount(userId)
      if (!existingAccount) {
        return null
      }

      // Fetch fresh data from Stripe
      const stripeAccount = await stripe.accounts.retrieve(existingAccount.stripeAccountId)
      
      // Save updated data
      await this.saveConnectedAccount(userId, stripeAccount)
      
      // Return fresh data
      return await this.getConnectedAccount(userId)
    } catch (error) {
      console.error("❌ Error refreshing connected Stripe account:", error)
      throw error
    }
  }

  static async deleteConnectedAccount(userId: string): Promise<void> {
    try {
      await db.collection("connectedStripeAccounts").doc(userId).delete()
      console.log(`✅ Connected Stripe account deleted for user: ${userId}`)
    } catch (error) {
      console.error("❌ Error deleting connected Stripe account:", error)
      throw error
    }
  }

  static async listAllConnectedAccounts(): Promise<{ userId: string; account: ConnectedStripeAccount }[]> {
    try {
      const snapshot = await db.collection("connectedStripeAccounts").get()
      const accounts: { userId: string; account: ConnectedStripeAccount }[] = []
      
      snapshot.forEach(doc => {
        accounts.push({
          userId: doc.id,
          account: doc.data() as ConnectedStripeAccount
        })
      })
      
      return accounts
    } catch (error) {
      console.error("❌ Error listing connected Stripe accounts:", error)
      throw error
    }
  }

  static async batchRefreshAccounts(): Promise<void> {
    try {
      const accounts = await this.listAllConnectedAccounts()
      console.log(`🔄 Refreshing ${accounts.length} connected accounts...`)
      
      for (const { userId, account } of accounts) {
        try {
          await this.refreshAccountFromStripe(userId)
          console.log(`✅ Refreshed account for user: ${userId}`)
        } catch (error) {
          console.error(`❌ Failed to refresh account for user ${userId}:`, error)
        }
      }
      
      console.log(`✅ Batch refresh completed`)
    } catch (error) {
      console.error("❌ Error in batch refresh:", error)
      throw error
    }
  }
}

// Export the function that the webhook processor needs
export async function getConnectedStripeAccount(userId: string): Promise<ConnectedStripeAccount | null> {
  return ConnectedStripeAccountsService.getConnectedAccount(userId)
}

// Export other commonly used functions
export const saveConnectedStripeAccount = ConnectedStripeAccountsService.saveConnectedAccount
export const refreshConnectedStripeAccount = ConnectedStripeAccountsService.refreshAccountFromStripe
export const deleteConnectedStripeAccount = ConnectedStripeAccountsService.deleteConnectedAccount
