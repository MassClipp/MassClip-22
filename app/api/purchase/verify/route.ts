import { NextResponse } from "next/server"
import Stripe from "stripe"

function mask(key?: string) {
  if (!key) return "undefined"
  return `${key.slice(0, 8)}…${key.slice(-4)}`
}

export async function POST(request: Request) {
  try {
    const { priceId, quantity = 1, mode } = await request.json()

    if (!priceId) {
      return new NextResponse("Price ID is required", { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST
    console.log(`🔑 [purchase-verify] Stripe key in use: ${mask(stripeKey)}`)

    if (!stripeKey) {
      return new NextResponse("Stripe key not found", { status: 500 })
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    })

    const price = await stripe.prices.retrieve(priceId)
    const product = await stripe.products.retrieve(price.product as string)

    const isTestMode = product.metadata.testMode === "true"

    const expectedMode = isTestMode ? "test" : "live"

    if (mode !== expectedMode) {
      return NextResponse.json(
        {
          error: "Test/Live mode mismatch",
          stripeKeyUsed: mask(stripeKey),
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.log("[PURCHASE_VERIFY]", error)
    return NextResponse.json(
      {
        error: error.message,
        stripeKeyUsed: mask(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST),
      },
      { status: 500 },
    )
  }
}
