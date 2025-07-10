import Stripe from "stripe"

// Use test keys for development/preview environments
const isProduction = process.env.NODE_ENV === "production" && !process.env.VERCEL_URL?.includes("vercel.app")

const stripeSecretKey = isProduction ? process.env.STRIPE_SECRET_KEY! : process.env.STRIPE_SECRET_KEY_TEST!

if (!stripeSecretKey) {
  throw new Error(`Missing Stripe secret key for ${isProduction ? "production" : "test"} mode`)
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

// Log which mode we're using
console.log(`🔧 Stripe initialized in ${isProduction ? "LIVE" : "TEST"} mode`)
console.log(`🔑 Using key: ${stripeSecretKey.substring(0, 12)}...`)
