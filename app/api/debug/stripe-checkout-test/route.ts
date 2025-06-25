import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { amount, connectedAccountId } = await request.json()

    if (!amount || !connectedAccountId) {
      return NextResponse.json({ error: "Amount and connected account ID required" }, { status: 400 })
    }

    // Calculate 25% platform fee
    const applicationFee = Math.round(amount * 0.25)
    const creatorAmount = amount - applicationFee

    console.log("🔍 Checkout Debug Info:")
    console.log("Total Amount:", amount, "cents")
    console.log("Platform Fee (25%):", applicationFee, "cents")
    console.log("Creator Amount (75%):", creatorAmount, "cents")
    console.log("Connected Account:", connectedAccountId)

    // Create checkout session with proper Connect setup
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Test Product - Platform Fee Test",
              description: "Testing 25% platform fee implementation",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      payment_intent_data: {
        application_fee_amount: applicationFee, // 25% platform fee
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata: {
          test_transaction: "true",
          platform_fee_amount: applicationFee.toString(),
          creator_amount: creatorAmount.toString(),
          fee_percentage: "25",
        },
      },
      metadata: {
        test_transaction: "true",
        platform_fee_test: "true",
      },
    })

    return NextResponse.json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
      debug: {
        totalAmount: amount,
        platformFee: applicationFee,
        creatorAmount: creatorAmount,
        connectedAccount: connectedAccountId,
      },
    })
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create checkout session",
        details: error.code || "unknown_error",
      },
      { status: 500 },
    )
  }
}
