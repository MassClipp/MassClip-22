import Stripe from "stripe"

// Determine environment and select appropriate keys
const isProduction = process.env.VERCEL_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"

// Use test keys for development and preview environments
const shouldUseTestKeys = isDevelopment || process.env.VERCEL_ENV === "preview"

// Select the appropriate secret key
const secretKey = shouldUseTestKeys
  ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  throw new Error("Missing Stripe secret key")
}

// Initialize Stripe with the selected key
export const stripe = new Stripe(secretKey, {
  apiVersion: "2024-06-20",
})

// Helper functions
export const isTestMode = () => secretKey?.startsWith("sk_test_") || false
export const getKeyType = () => (secretKey?.startsWith("sk_test_") ? "test" : "live")

// Log the configuration (without exposing the full key)
console.log("🔧 Stripe Configuration:", {
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  keyType: getKeyType(),
  isTestMode: isTestMode(),
  keyPrefix: secretKey?.substring(0, 8) + "...",
})

export default stripe
