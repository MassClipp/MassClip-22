import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    console.log("🔧 [Test Stripe] Testing Stripe API connection...")

    // Test basic Stripe API access by retrieving account information
    const account = await stripe.accounts.retrieve()

    console.log("✅ [Test Stripe] Stripe API connection successful")
    console.log("📊 [Test Stripe] Account details:", {
      id: account.id,
      business_type: account.business_type,
      country: account.country,
      email: account.email,
    })

    // Test if we can create a price (indicates API keys have proper permissions)
    const testPrice = await stripe.prices.create({
      unit_amount: 1999, // $19.99
      currency: "usd",
      product_data: {
        name: "Test Product - API Connection Check",
      },
    })

    console.log("✅ [Test Stripe] Successfully created test price:", testPrice.id)

    return NextResponse.json({
      success: true,
      connected: true,
      message: "Stripe connection successful",
      accountId: account.id,
      priceId: testPrice.id,
      priceDetails: {
        id: testPrice.id,
        active: testPrice.active,
        currency: testPrice.currency,
        product: testPrice.product,
        unitAmount: testPrice.unit_amount,
      },
    })
  } catch (error: any) {
    console.error("❌ [Test Stripe] Stripe connection failed:", error)

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message: "Stripe connection failed",
        error: error.message,
        code: error.code,
        type: error.type,
      },
      { status: 500 },
    )
  }
}
