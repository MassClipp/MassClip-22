import Stripe from "stripe"

// Determine environment and select appropriate keys
const isProduction = process.env.VERCEL_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"
const isPreview = process.env.VERCEL_ENV === "preview"

// Force test keys for development and preview environments
const useTestKeys = isDevelopment || isPreview || !isProduction

console.log("🔍 [Stripe Config] Environment detection:", {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  isProduction,
  isDevelopment,
  isPreview,
  useTestKeys,
})

// Select the appropriate Stripe secret key - FORCE test keys in preview
let stripeSecretKey: string | undefined

if (useTestKeys) {
  // For test environments, prioritize test keys
  stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  console.log("🧪 [Stripe Config] Using test environment - prioritizing test keys")
} else {
  // For production, use live keys
  stripeSecretKey = process.env.STRIPE_SECRET_KEY
  console.log("🔴 [Stripe Config] Using production environment - using live keys")
}

// Select the appropriate publishable key
let stripePublishableKey: string | undefined

if (useTestKeys) {
  stripePublishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
} else {
  stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
}

// Validate we have the required keys
if (!stripeSecretKey) {
  const missingKey = useTestKeys ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY"
  throw new Error(`Missing ${missingKey} environment variable`)
}

if (!stripePublishableKey) {
  const missingKey = useTestKeys ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST" : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  console.warn(`Missing ${missingKey} environment variable`)
}

// Determine actual mode based on the key we're using
const actuallyUsingTestMode = stripeSecretKey?.startsWith("sk_test_")
const actuallyUsingLiveMode = stripeSecretKey?.startsWith("sk_live_")

// FORCE test mode in preview - if we don't have test keys, throw error
if (isPreview && !actuallyUsingTestMode) {
  console.error("❌ [Stripe Config] CRITICAL: Preview environment must use test keys!")
  console.error("❌ [Stripe Config] Current key:", stripeSecretKey?.substring(0, 7))
  console.error("❌ [Stripe Config] Available env vars:", {
    STRIPE_SECRET_KEY_TEST: !!process.env.STRIPE_SECRET_KEY_TEST,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
  })
  throw new Error("Preview environment requires STRIPE_SECRET_KEY_TEST environment variable")
}

console.log(`🔑 [Stripe Config] Key selection:`, {
  intendedMode: useTestKeys ? "TEST" : "LIVE",
  actualMode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
  keyPrefix: stripeSecretKey?.substring(0, 7),
  hasPublishableKey: !!stripePublishableKey,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
})

// Initialize Stripe with the selected key
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Export the publishable key for client-side usage
export const STRIPE_PUBLISHABLE_KEY = stripePublishableKey

// Export environment info
export const STRIPE_CONFIG = {
  isTestMode: actuallyUsingTestMode,
  isLiveMode: actuallyUsingLiveMode,
  intendedTestMode: useTestKeys,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  hasPublishableKey: !!stripePublishableKey,
  keyMismatch: useTestKeys !== actuallyUsingTestMode,
}

// Log final configuration
console.log(`✅ [Stripe Config] Final configuration:`, {
  mode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
  environment: STRIPE_CONFIG.environment,
  keyMismatch: STRIPE_CONFIG.keyMismatch,
  isPreview,
  forcedTestMode: isPreview && actuallyUsingTestMode,
})

if (STRIPE_CONFIG.keyMismatch) {
  console.warn(
    `⚠️ [Stripe Config] Key mismatch detected! Intended ${useTestKeys ? "TEST" : "LIVE"} but using ${actuallyUsingTestMode ? "TEST" : "LIVE"} keys`,
  )
}

// Success confirmation for preview
if (isPreview && actuallyUsingTestMode) {
  console.log("🎉 [Stripe Config] Preview environment successfully configured with test keys!")
}
