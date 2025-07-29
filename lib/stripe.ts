// lib/stripe.ts

import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// Named export for stripe
export { stripe }

// Environment detection
export const isTestMode = !process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
export const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")

export default stripe

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

// Add the missing export - alias for retrieveSessionSmart
export const retrieveStripeSession = retrieveSessionSmart

// Additional helper functions for common Stripe operations
export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, connectedAccountId?: string) {
  try {
    const options: Stripe.RequestOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : {}

    const session = await stripe.checkout.sessions.create(params, options)
    console.log(`✅ [Stripe] Created checkout session: ${session.id}`)
    return session
  } catch (error: any) {
    console.error(`❌ [Stripe] Failed to create checkout session:`, error)
    throw error
  }
}

export async function retrievePaymentIntent(paymentIntentId: string, connectedAccountId?: string) {
  try {
    const options: Stripe.RequestOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : {}

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, options)
    console.log(`✅ [Stripe] Retrieved payment intent: ${paymentIntent.id}`)
    return paymentIntent
  } catch (error: any) {
    console.error(`❌ [Stripe] Failed to retrieve payment intent:`, error)
    throw error
  }
}
