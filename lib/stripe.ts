// Centralised Stripe helpers --------------------------------------------------
import Stripe from "stripe"

const secretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY

if (!secretKey) throw new Error("STRIPE_SECRET_KEY[_TEST] is missing")

export const stripe = new Stripe(secretKey, {
  apiVersion: "2023-10-16",
  typescript: true,
})

export const isTestMode = process.env.NODE_ENV !== "production" || secretKey.startsWith("sk_test_")

/**
 * 25 % platform fee – returns fee in **cents**
 */
export function calculateApplicationFee(amountInCents: number) {
  return Math.round(amountInCents * 0.25)
}

/* -------------------------------------------------------------------------- */
/*                Connected-account convenience helpers                       */
/* -------------------------------------------------------------------------- */

/**
 * Create a Stripe instance scoped to a connected account
 */
export function createStripeWithAccount(accountId: string) {
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    typescript: true,
    stripeAccount: accountId,
  })
}

/**
 * Execute any Stripe call inside the context of a connected account
 */
export async function callStripeWithAccount<T>(accountId: string, op: (scoped: Stripe) => Promise<T>): Promise<T> {
  const scoped = createStripeWithAccount(accountId)
  return op(scoped)
}

/**
 * Retrieve a checkout session, automatically handling connected/platform
 */
export async function retrieveSessionWithAccount(sessionId: string, accountId?: string) {
  if (accountId) {
    return callStripeWithAccount(accountId, (s) => s.checkout.sessions.retrieve(sessionId))
  }
  return stripe.checkout.sessions.retrieve(sessionId)
}
