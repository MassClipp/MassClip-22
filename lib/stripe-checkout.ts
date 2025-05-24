import { loadStripe, type Stripe } from "@stripe/stripe-js"

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

export const redirectToCheckout = async (sessionId: string) => {
  try {
    const stripe = await getStripe()
    if (!stripe) {
      throw new Error("Failed to load Stripe")
    }

    const { error } = await stripe.redirectToCheckout({ sessionId })

    if (error) {
      console.error("Error redirecting to checkout:", error)
      throw new Error(error.message)
    }
  } catch (error) {
    console.error("Error in redirectToCheckout:", error)
    throw error
  }
}
