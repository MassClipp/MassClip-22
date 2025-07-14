import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

// Check if we're in test mode
export const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || false

console.log(`🔧 [Stripe] Initialized in ${isTestMode ? "TEST" : "LIVE"} mode`)

/**
 * Create a Stripe instance configured for a connected account
 */
export function createStripeWithAccount(accountId: string) {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
    stripeAccount: accountId,
  })
}

/**
 * Execute a Stripe operation with connected account context
 */
export async function callStripeWithAccount<T>(
  accountId: string,
  operation: (stripe: Stripe) => Promise<T>,
): Promise<T> {
  const stripeWithAccount = createStripeWithAccount(accountId)
  return await operation(stripeWithAccount)
}

/**
 * Retrieve a checkout session with connected account context
 */
export async function retrieveSessionWithAccount(sessionId: string, accountId?: string) {
  if (accountId) {
    console.log(`🔍 [Stripe] Retrieving session ${sessionId} with account ${accountId}`)
    return await callStripeWithAccount(accountId, (stripe) => stripe.checkout.sessions.retrieve(sessionId))
  } else {
    console.log(`🔍 [Stripe] Retrieving session ${sessionId} from platform account`)
    return await stripe.checkout.sessions.retrieve(sessionId)
  }
}

/**
 * Create a checkout session with connected account context
 */
export async function createCheckoutSessionWithAccount(
  params: Stripe.Checkout.SessionCreateParams,
  accountId?: string,
) {
  if (accountId) {
    console.log(`💳 [Stripe] Creating checkout session with account ${accountId}`)
    return await callStripeWithAccount(accountId, (stripe) => stripe.checkout.sessions.create(params))
  } else {
    console.log(`💳 [Stripe] Creating checkout session on platform account`)
    return await stripe.checkout.sessions.create(params)
  }
}
