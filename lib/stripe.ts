import Stripe from "stripe"

// Use live keys in production, test keys in development
const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Determine if we're in test mode based on the key and environment
export const isTestMode = secretKey?.startsWith("sk_test_") || false
export const isLiveMode = !isTestMode

console.log(`🔧 [Stripe Config] Mode: ${isLiveMode ? "LIVE" : "TEST"} | Environment: ${process.env.NODE_ENV}`)

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
    console.log(
      `💳 [Stripe] Creating checkout session with account ${accountId} in ${isLiveMode ? "LIVE" : "TEST"} mode`,
    )
    return await callStripeWithAccount(accountId, (stripe) => stripe.checkout.sessions.create(params))
  } else {
    console.log(`💳 [Stripe] Creating checkout session on platform account in ${isLiveMode ? "LIVE" : "TEST"} mode`)
    return await stripe.checkout.sessions.create(params)
  }
}

/**
 * Validate that we're using the correct environment keys
 */
export function validateStripeEnvironment() {
  const isProduction = process.env.NODE_ENV === "production"
  const hasLiveKey = secretKey.startsWith("sk_live_")
  const hasTestKey = secretKey.startsWith("sk_test_")

  if (isProduction && !hasLiveKey) {
    console.warn("⚠️ [Stripe] WARNING: Running in production but using test keys!")
    return false
  }

  if (!isProduction && hasLiveKey) {
    console.warn("⚠️ [Stripe] WARNING: Running in development but using live keys!")
    return false
  }

  console.log(
    `✅ [Stripe] Environment validation passed: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} with ${hasLiveKey ? "LIVE" : "TEST"} keys`,
  )
  return true
}

// Helper to get the correct webhook secret
export const getWebhookSecret = () => {
  if (isTestMode) {
    return process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET
  }
  return process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET
}

// Validate on module load
validateStripeEnvironment()
