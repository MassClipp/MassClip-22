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
 * Validate that an account exists and is accessible
 */
export async function validateConnectedAccount(accountId: string): Promise<boolean> {
  try {
    await stripe.accounts.retrieve(accountId)
    return true
  } catch (error) {
    console.error(`❌ [Stripe] Invalid connected account: ${accountId}`, error)
    return false
  }
}

/**
 * Get application fee amount (25% platform fee)
 */
export function calculateApplicationFee(amount: number): number {
  return Math.round(amount * 0.25) // 25% platform fee
}
