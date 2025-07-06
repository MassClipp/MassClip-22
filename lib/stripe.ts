import Stripe from "stripe"

// Determine which Stripe key to use based on environment
function getStripeKey(): string {
  const nodeEnv = process.env.NODE_ENV
  const vercelEnv = process.env.VERCEL_ENV

  // Use live key only in production
  const isProduction = nodeEnv === "production" && vercelEnv === "production"

  let stripeKey: string | undefined

  if (isProduction) {
    stripeKey = process.env.STRIPE_SECRET_KEY
    console.log("🔑 [Stripe] Using live key for production environment")
  } else {
    // Use test key for development, preview, and any non-production environment
    stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    console.log("🔑 [Stripe] Using test key for development/preview environment")
  }

  if (!stripeKey) {
    const missingKey = isProduction ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY_TEST"
    throw new Error(`${missingKey} environment variable is not set`)
  }

  // Validate key format
  const expectedPrefix = isProduction ? "sk_live_" : "sk_test_"
  if (!stripeKey.startsWith(expectedPrefix)) {
    console.warn(
      `⚠️ [Stripe] Key mismatch: Expected ${expectedPrefix} for ${isProduction ? "production" : "development"} but got ${stripeKey.substring(0, 8)}`,
    )
  }

  console.log(`✅ [Stripe] Initialized with ${isProduction ? "live" : "test"} key (${stripeKey.substring(0, 8)}...)`)
  return stripeKey
}

export const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Helper function to check if we're using test mode
export const isTestMode = (): boolean => {
  return stripe._apiKey.startsWith("sk_test_")
}

// Helper function to get the key type for logging
export const getKeyType = (): "test" | "live" => {
  return stripe._apiKey.startsWith("sk_test_") ? "test" : "live"
}

export default stripe
