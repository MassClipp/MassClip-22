import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })

    // Test Stripe API connection
    const account = await stripe.accounts.list({ limit: 1 })

    return NextResponse.json({
      success: true,
      message: "Stripe API connection successful",
      accountsCount: account.data.length,
      stripeVersion: "2024-06-20",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Stripe API connection failed",
        details: error.message,
        type: error.type,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
