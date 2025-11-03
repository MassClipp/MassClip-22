// lib/stripe.ts

import Stripe from "stripe"

const stripeKey = process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY!

const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
})

// Named export for stripe
export { stripe }

// Environment detection
export const isTestMode =
  !!process.env.STRIPE_TEST_KEY ||
  !!process.env.STRIPE_SECRET_KEY_TEST ||
  !process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
export const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")

// Helper function to retrieve sessions from connected accounts
export async function retrieveSessionWithAccount(sessionId: string, connectedAccountId: string) {
  try {
    console.log(`🔗 [Stripe] Retrieving session ${sessionId} from connected account ${connectedAccountId}`)

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
      stripeAccount: connectedAccountId,
    })

    console.log(`✅ [Stripe] Successfully retrieved session from connected account`)
    return session
  } catch (error: any) {
    console.error(`❌ [Stripe] Failed to retrieve session from connected account:`, error)
    throw error
  }
}

// Helper function to try both platform and connected account retrieval
export async function retrieveSessionSmart(sessionId: string, connectedAccountId?: string) {
  // If we have a connected account ID, try that first
  if (connectedAccountId) {
    try {
      return await retrieveSessionWithAccount(sessionId, connectedAccountId)
    } catch (error: any) {
      console.log(`⚠️ [Stripe] Connected account retrieval failed, trying platform account...`)
      // Fall through to platform account attempt
    }
  }

  // Try platform account
  try {
    console.log(`🏢 [Stripe] Retrieving session from platform account`)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })
    console.log(`✅ [Stripe] Successfully retrieved session from platform account`)
    return session
  } catch (error: any) {
    console.error(`❌ [Stripe] Platform account retrieval also failed:`, error)
    throw error
  }
}

export default stripe
