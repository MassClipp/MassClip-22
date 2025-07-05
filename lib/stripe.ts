import Stripe from "stripe"

function getStripeKey(): string {
  const vercelEnv = process.env.VERCEL_ENV || "development"
  const isProduction = vercelEnv === "production"

  let stripeKey: string | undefined

  if (isProduction) {
    // Use live key for production
    stripeKey = process.env.STRIPE_SECRET_KEY
    console.log("🔑 [Stripe] Using production key (STRIPE_SECRET_KEY)")
  } else {
    // Use test key for preview/development, fallback to main key
    stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    const keySource = process.env.STRIPE_SECRET_KEY_TEST ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY (fallback)"
    console.log(`🔑 [Stripe] Using ${keySource} for ${vercelEnv} environment`)
  }

  if (!stripeKey) {
    const missingKey = isProduction ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY_TEST"
    throw new Error(`${missingKey} environment variable is not set for ${vercelEnv} environment`)
  }

  // Validate key format
  const keyPrefix = stripeKey.substring(0, 8)
  if (!keyPrefix.startsWith("sk_test_") && !keyPrefix.startsWith("sk_live_")) {
    throw new Error(`Invalid Stripe key format: ${keyPrefix}`)
  }

  console.log(`✅ [Stripe] Initialized with ${keyPrefix.startsWith("sk_live_") ? "live" : "test"} key`)
  return stripeKey
}

export const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2024-06-20",
  typescript: true,
})

export default stripe
