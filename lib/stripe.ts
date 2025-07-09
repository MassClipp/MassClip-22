import Stripe from "stripe"

// Force live keys for all environments since test keys don't work due to permissions
const FORCE_LIVE_MODE = true

console.log("🔍 [Stripe Config] Environment detection:", {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  FORCE_LIVE_MODE,
})

// Always use live Stripe secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Always use live publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// Validate we have the required keys
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable")
}

if (!stripePublishableKey) {
  console.warn("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable")
}

// Determine actual mode based on the key we're using
const actuallyUsingTestMode = stripeSecretKey?.startsWith("sk_test_")
const actuallyUsingLiveMode = stripeSecretKey?.startsWith("sk_live_")

// Warn if we're not using live keys when we should be
if (FORCE_LIVE_MODE && !actuallyUsingLiveMode) {
  console.error("❌ [Stripe Config] CRITICAL: Should be using live keys but detected test key!")
  console.error("❌ [Stripe Config] Current key:", stripeSecretKey?.substring(0, 7))
  console.error("❌ [Stripe Config] Please ensure STRIPE_SECRET_KEY is set to your live key (sk_live_...)")
}

console.log(`🔑 [Stripe Config] Key selection:`, {
  intendedMode: "LIVE (FORCED)",
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
  forcedLiveMode: FORCE_LIVE_MODE,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  hasPublishableKey: !!stripePublishableKey,
  shouldBeLive: FORCE_LIVE_MODE && !actuallyUsingLiveMode,
}

// Log final configuration
console.log(`✅ [Stripe Config] Final configuration:`, {
  mode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
  environment: STRIPE_CONFIG.environment,
  forcedLiveMode: FORCE_LIVE_MODE,
  shouldBeLive: STRIPE_CONFIG.shouldBeLive,
})

if (STRIPE_CONFIG.shouldBeLive) {
  console.error(
    `⚠️ [Stripe Config] CONFIGURATION ERROR: Forced live mode but using ${actuallyUsingTestMode ? "TEST" : "UNKNOWN"} keys!`,
  )
}

// Success confirmation for live mode
if (FORCE_LIVE_MODE && actuallyUsingLiveMode) {
  console.log("🎉 [Stripe Config] Successfully configured with LIVE keys as required!")
}
