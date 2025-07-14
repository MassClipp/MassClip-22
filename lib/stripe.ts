import Stripe from "stripe"

/* ------------------------------------------------------------------
   Single place to initialise Stripe + helpers for connected accounts
-------------------------------------------------------------------*/
const secretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY

if (!secretKey) throw new Error("STRIPE_SECRET_KEY[_TEST] is missing")

export const stripe = new Stripe(secretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export const isTestMode = process.env.NODE_ENV !== "production" || secretKey.startsWith("sk_test_")

/** 25 % platform fee → returns fee in cents  */
export function calculateApplicationFee(amountInCents: number) {
  return Math.round(amountInCents * 0.25)
}

/** Create a scoped Stripe instance for a connected account */
export function stripeForAccount(accountId: string) {
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    typescript: true,
    stripeAccount: accountId,
  })
}
