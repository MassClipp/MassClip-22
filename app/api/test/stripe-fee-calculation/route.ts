import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json() // amount in cents

    if (!amount || amount < 50) {
      return NextResponse.json({ error: "Amount must be at least $0.50" }, { status: 400 })
    }

    // Calculate 25% platform fee
    const platformFee = Math.round(amount * 0.25)
    const creatorAmount = amount - platformFee

    return NextResponse.json({
      success: true,
      calculation: {
        totalAmount: amount,
        platformFee: platformFee,
        creatorAmount: creatorAmount,
        platformFeePercentage: "25%",
        creatorPercentage: "75%",
      },
      breakdown: {
        total: `$${(amount / 100).toFixed(2)}`,
        platformFee: `$${(platformFee / 100).toFixed(2)}`,
        creatorReceives: `$${(creatorAmount / 100).toFixed(2)}`,
      },
    })
  } catch (error) {
    console.error("Error calculating fees:", error)
    return NextResponse.json({ error: "Failed to calculate fees" }, { status: 500 })
  }
}
