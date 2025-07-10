import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY_TEST) {
  throw new Error("Missing Stripe secret key")
}

// Use test key by default in development, live key only in production with explicit flag
const useTestMode = process.env.NODE_ENV !== "production" || process.env.STRIPE_FORCE_TEST === "true"
const stripeKey = useTestMode ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY

if (!stripeKey) {
  throw new Error(`Missing Stripe ${useTestMode ? "test" : "live"} secret key`)
}

console.log(`🔧 [Stripe] Using ${useTestMode ? "TEST" : "LIVE"} mode`)

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export const isTestMode = useTestMode
