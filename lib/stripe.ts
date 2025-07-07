import Stripe from "stripe"

// Determine environment and select appropriate keys
const isProduction = process.env.VERCEL_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"
const isPreview = process.env.VERCEL_ENV === "preview"

// Use test keys for development and preview environments, live keys only for production
const useTestKeys = isDevelopment || isPreview || !isProduction

console.log("🔍 [Stripe Config] Environment detection:", {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  isProduction,
  isDevelopment,
  isPreview,
  useTestKeys,
})

// Select the appropriate Stripe secret key
const stripeSecretKey = useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY

// Select the appropriate publishable key
const stripePublishableKey = useTestKeys
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// Fallback to regular keys if test keys are not available
const finalSecretKey = stripeSecretKey || process.env.STRIPE_SECRET_KEY
const finalPublishableKey = stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!finalSecretKey) {
  const missingKey = useTestKeys ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY"
  throw new Error(`Missing ${missingKey} environment variable`)
}

if (!finalPublishableKey) {
  const missingKey = useTestKeys ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST" : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  console.warn(`Missing ${missingKey} environment variable`)
}

// Determine actual mode based on the key we're using
const actuallyUsingTestMode = finalSecretKey?.startsWith("sk_test_")
const actuallyUsingLiveMode = finalSecretKey?.startsWith("sk_live_")

console.log(`🔑 [Stripe Config] Key selection:`, {
  intendedMode: useTestKeys ? "TEST" : "LIVE",
  actualMode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
  keyPrefix: finalSecretKey?.substring(0, 7),
  hasPublishableKey: !!finalPublishableKey,
})

// Initialize Stripe with the selected key
export const stripe = new Stripe(finalSecretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Export the publishable key for client-side usage
export const STRIPE_PUBLISHABLE_KEY = finalPublishableKey

// Export environment info
export const STRIPE_CONFIG = {
  isTestMode: actuallyUsingTestMode,
  isLiveMode: actuallyUsingLiveMode,
  intendedTestMode: useTestKeys,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  hasPublishableKey: !!finalPublishableKey,
  keyMismatch: useTestKeys !== actuallyUsingTestMode,
}

// Log final configuration
console.log(`✅ [Stripe Config] Final configuration:`, {
  mode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
  environment: STRIPE_CONFIG.environment,
  keyMismatch: STRIPE_CONFIG.keyMismatch,
})

if (STRIPE_CONFIG.keyMismatch) {
  console.warn(
    `⚠️ [Stripe Config] Key mismatch detected! Intended ${useTestKeys ? "TEST" : "LIVE"} but using ${actuallyUsingTestMode ? "TEST" : "LIVE"} keys`,
  )
}
