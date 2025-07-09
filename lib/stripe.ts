import Stripe from "stripe"

// Prioritize live keys for production, fall back to test keys for development
const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

console.log("🔍 [Stripe Config] Environment check:", {
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
})

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

console.log(`🔑 [Stripe Config] Key configuration:`, {
  mode: actuallyUsingTestMode ? "TEST" : actuallyUsingLiveMode ? "LIVE" : "UNKNOWN",
  keyPrefix: stripeSecretKey?.substring(0, 12) + "...",
  hasPublishableKey: !!stripePublishableKey,
  keyLength: stripeSecretKey?.length,
})

// Warn if using test keys in production
if (isProduction && actuallyUsingTestMode) {
  console.warn("⚠️ [Stripe Config] WARNING: Using test keys in production environment!")
}

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
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  hasPublishableKey: !!stripePublishableKey,
  isProduction,
}

console.log(`✅ [Stripe Config] Stripe initialized successfully in ${actuallyUsingLiveMode ? "LIVE" : "TEST"} mode`)
