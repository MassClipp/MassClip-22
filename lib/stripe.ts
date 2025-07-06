import Stripe from "stripe"

// Determine environment and select appropriate keys
const isProduction = process.env.VERCEL_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"

// Use test keys for development and preview environments
const shouldUseTestKeys = isDevelopment || process.env.VERCEL_ENV === "preview"

const stripeSecretKey = shouldUseTestKeys
  ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY

const stripePublishableKey = shouldUseTestKeys
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripeSecretKey) {
  throw new Error(`Missing Stripe secret key for ${shouldUseTestKeys ? "test" : "live"} environment`)
}

console.log(`🔑 [Stripe] Using ${shouldUseTestKeys ? "TEST" : "LIVE"} keys`)
console.log(`🔑 [Stripe] Environment: ${process.env.VERCEL_ENV || "development"}`)

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
})

export const STRIPE_PUBLISHABLE_KEY = stripePublishableKey
export const IS_TEST_MODE = shouldUseTestKeys
