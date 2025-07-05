import Stripe from "stripe"

function getStripeKey(): string {
  const vercelEnv = process.env.VERCEL_ENV || "development"
  const isProduction = vercelEnv === "production"

  let stripeKey: string | undefined

  if (isProduction) {
    // Use live key for production
    stripeKey = process.env.STRIPE_SECRET_KEY
  } else {
    // Use test key for preview/development, fallback to main key
    stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
  }

  if (!stripeKey) {
    throw new Error(
      isProduction
        ? "STRIPE_SECRET_KEY environment variable is not set for production"
        : "STRIPE_SECRET_KEY_TEST environment variable is not set for preview/development",
    )
  }

  return stripeKey
}

export const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2024-06-20",
  typescript: true,
})

export default stripe
