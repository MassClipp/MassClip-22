import Stripe from "stripe"

// Force test mode for all environments except explicit production
const forceTestMode = process.env.STRIPE_FORCE_TEST !== "false"
const isExplicitProduction = process.env.NODE_ENV === "production" && process.env.STRIPE_FORCE_TEST === "false"

const useTestMode = forceTestMode || !isExplicitProduction

// Get the appropriate key
const stripeKey = useTestMode ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY

if (!stripeKey) {
  throw new Error(`Missing Stripe ${useTestMode ? "test" : "live"} secret key`)
}

console.log(`🔧 [Stripe] FORCING ${useTestMode ? "TEST" : "LIVE"} mode`)
console.log(`🔑 [Stripe] Using key: ${stripeKey.substring(0, 12)}...`)

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export const isTestMode = useTestMode

// Log the mode clearly
if (useTestMode) {
  console.log("🧪 [Stripe] TEST MODE ACTIVE - Using test keys and test checkout sessions")
} else {
  console.log("🔴 [Stripe] LIVE MODE ACTIVE - Using live keys and live checkout sessions")
}
