import Stripe from "stripe"

// Determine environment and select appropriate keys
const isProduction = process.env.VERCEL_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"
const isPreview = process.env.VERCEL_ENV === "preview"

// Use test keys for development and preview environments
const useTestKeys = isDevelopment || isPreview || !isProduction

// Select the appropriate Stripe secret key
const stripeSecretKey = useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY

// Select the appropriate publishable key
const stripePublishableKey = useTestKeys
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripeSecretKey) {
  const missingKey = useTestKeys ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY"
  throw new Error(`Missing ${missingKey} environment variable`)
}

if (!stripePublishableKey) {
  const missingKey = useTestKeys ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST" : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  console.warn(`Missing ${missingKey} environment variable`)
}

console.log(`🔑 Stripe initialized in ${useTestKeys ? "TEST" : "LIVE"} mode`)
console.log(`Environment: ${process.env.VERCEL_ENV || process.env.NODE_ENV}`)

// Initialize Stripe with the selected key
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Export the publishable key for client-side usage
export const STRIPE_PUBLISHABLE_KEY = stripePublishableKey

// Export environment info
export const STRIPE_CONFIG = {
  isTestMode: useTestKeys,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  hasPublishableKey: !!stripePublishableKey,
}
