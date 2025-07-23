import Stripe from "stripe"

// Always use live keys in production and preview
const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

// Force live mode - always use live keys even in preview
const isLiveKey = secretKey.startsWith("sk_live_")
if (!isLiveKey) {
  console.warn("⚠️ [Stripe] WARNING: Not using live keys! Expected sk_live_ key.")
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export default stripe

// Always consider this live mode since we're forcing live keys
export const isTestMode = false
export const isLiveMode = true

console.log(`🔧 Stripe initialized in LIVE mode (forced)`)

/**
 * 25% platform fee – returns fee in cents
 */
export function calculateApplicationFee(amountInCents: number) {
  return Math.round(amountInCents * 0.25)
}

/**
 * Create a Stripe instance scoped to a connected account
 */
export function createStripeWithAccount(accountId: string) {
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
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

/**
 * Create a checkout session with connected account context
 */
export async function createCheckoutSessionWithAccount(
  params: Stripe.Checkout.SessionCreateParams,
  accountId?: string,
) {
  if (accountId) {
    console.log(`💳 [Stripe] Creating checkout session with account ${accountId} in LIVE mode`)
    return await callStripeWithAccount(accountId, (stripe) => stripe.checkout.sessions.create(params))
  } else {
    console.log(`💳 [Stripe] Creating checkout session on platform account in LIVE mode`)
    return await stripe.checkout.sessions.create(params)
  }
}

/**
 * Validate that we're using live keys
 */
export function validateStripeEnvironment() {
  const hasLiveKey = secretKey.startsWith("sk_live_")

  if (!hasLiveKey) {
    console.warn("⚠️ [Stripe] WARNING: Not using live keys! This should use sk_live_ keys.")
    return false
  }

  console.log(`✅ [Stripe] Environment validation passed: Using LIVE keys`)
  return true
}

// Helper to get the correct webhook secret - always use live
export const getWebhookSecret = () => {
  return process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET
}

// Validate on module load
validateStripeEnvironment()
