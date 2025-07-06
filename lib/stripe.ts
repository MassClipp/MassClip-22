import Stripe from "stripe"

// Determine which Stripe key to use based on environment
function getStripeKey(): string {
  const nodeEnv = process.env.NODE_ENV
  const vercelEnv = process.env.VERCEL_ENV

  console.log("🔧 [Stripe Init] Environment detection:", {
    nodeEnv,
    vercelEnv,
    hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
    hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
    testKeyLength: process.env.STRIPE_SECRET_KEY_TEST?.length || 0,
    liveKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
  })

  // Use live key only in production
  const isProduction = nodeEnv === "production" || vercelEnv === "production"

  let stripeKey: string | undefined

  if (isProduction) {
    stripeKey = process.env.STRIPE_SECRET_KEY
    console.log("🔑 [Stripe] Attempting to use live key for production environment")
  } else {
    // For development/preview, prefer test key but fallback to live key if test key is not available
    stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    const keySource = process.env.STRIPE_SECRET_KEY_TEST ? "test key" : "live key (fallback)"
    console.log(`🔑 [Stripe] Attempting to use ${keySource} for development/preview environment`)
  }

  if (!stripeKey) {
    const missingKey = isProduction ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY"
    const error = `${missingKey} environment variable is not set`
    console.error("❌ [Stripe Init] Error:", error)
    throw new Error(error)
  }

  // Validate key format
  const keyPrefix = stripeKey.substring(0, 8)
  const isTestKey = keyPrefix.startsWith("sk_test_")
  const isLiveKey = keyPrefix.startsWith("sk_live_")

  if (!isTestKey && !isLiveKey) {
    const error = `Invalid Stripe key format. Expected sk_test_ or sk_live_ but got ${keyPrefix}`
    console.error("❌ [Stripe Init] Error:", error)
    throw new Error(error)
  }

  // Log what we're actually using
  console.log(`✅ [Stripe] Successfully initialized with ${isTestKey ? "test" : "live"} key`, {
    keyPrefix,
    environment: isProduction ? "production" : "development/preview",
    keyType: isTestKey ? "test" : "live",
  })

  return stripeKey
}

let stripeInstance: Stripe | null = null

try {
  stripeInstance = new Stripe(getStripeKey(), {
    apiVersion: "2024-06-20",
    typescript: true,
  })
  console.log("✅ [Stripe] Instance created successfully")
} catch (error) {
  console.error("❌ [Stripe] Failed to create Stripe instance:", error)
  throw error
}

export const stripe = stripeInstance

// Helper function to check if we're using test mode
export const isTestMode = (): boolean => {
  if (!stripe) {
    throw new Error("Stripe instance not initialized")
  }
  return stripe._apiKey.startsWith("sk_test_")
}

// Helper function to get the key type for logging
export const getKeyType = (): "test" | "live" => {
  if (!stripe) {
    throw new Error("Stripe instance not initialized")
  }
  return stripe._apiKey.startsWith("sk_test_") ? "test" : "live"
}

export default stripe
