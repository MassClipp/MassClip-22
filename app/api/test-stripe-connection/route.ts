import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    console.log("🔍 [Test Stripe] Testing Stripe API connection...")

    // Test basic Stripe connection by retrieving account info
    const account = await stripe.accounts.retrieve()

    console.log("✅ [Test Stripe] Successfully connected to Stripe")
    console.log("📊 [Test Stripe] Account ID:", account.id)
    console.log("📊 [Test Stripe] Account Type:", account.type)
    console.log("📊 [Test Stripe] Charges Enabled:", account.charges_enabled)

    // Test creating a price to verify API permissions
    let testPrice = null
    try {
      // Create a test product first
      const testProduct = await stripe.products.create({
        name: "Test Product - Connection Check",
        metadata: {
          test: "true",
          created_by: "massclip_diagnostic",
        },
      })

      testPrice = await stripe.prices.create({
        unit_amount: 1999, // $19.99
        currency: "usd",
        product: testProduct.id,
        metadata: {
          test: "true",
          created_by: "massclip_diagnostic",
        },
      })

      console.log("✅ [Test Stripe] Successfully created test price:", testPrice.id)
    } catch (priceError: any) {
      console.warn("⚠️ [Test Stripe] Could not create test price:", priceError.message)
    }

    return NextResponse.json({
      success: true,
      connected: true,
      message: "Stripe connection successful",
      accountId: account.id,
      accountType: account.type,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      priceId: testPrice?.id,
      priceDetails: testPrice
        ? {
            id: testPrice.id,
            active: testPrice.active,
            currency: testPrice.currency,
            product: testPrice.product,
            unitAmount: testPrice.unit_amount,
          }
        : null,
    })
  } catch (error: any) {
    console.error("❌ [Test Stripe] Connection failed:", error)

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
