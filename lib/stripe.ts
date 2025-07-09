import Stripe from "stripe"

// Force live mode - ensure we're using live keys
const isLiveMode = true

// Get the appropriate Stripe secret key
const getStripeSecretKey = () => {
  if (isLiveMode) {
    const liveKey = process.env.STRIPE_SECRET_KEY
    if (!liveKey) {
      throw new Error("STRIPE_SECRET_KEY (live) is not set")
    }
    if (!liveKey.startsWith("sk_live_")) {
      throw new Error("STRIPE_SECRET_KEY must be a live key (sk_live_...)")
    }
    return liveKey
  } else {
    const testKey = process.env.STRIPE_SECRET_KEY_TEST
    if (!testKey) {
      throw new Error("STRIPE_SECRET_KEY_TEST is not set")
    }
    if (!testKey.startsWith("sk_test_")) {
      throw new Error("STRIPE_SECRET_KEY_TEST must be a test key (sk_test_...)")
    }
    return testKey
  }
}

// Initialize Stripe with live configuration
export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Export mode information for debugging
export const stripeConfig = {
  isLiveMode,
  keyType: isLiveMode ? "live" : "test",
  environment: isLiveMode ? "production" : "development",
}

console.log(`🔥 Stripe initialized in ${stripeConfig.environment} mode (${stripeConfig.keyType})`)
