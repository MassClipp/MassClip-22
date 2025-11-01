import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET(request: Request) {
  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Create a test customer
    const customer = await stripe.customers.create({
      email: "test@example.com",
      metadata: {
        test: "This is a test metadata value",
        timestamp: new Date().toISOString(),
      },
    })

    // Create a test product
    const product = await stripe.products.create({
      name: "Test Product",
      metadata: {
        test: "This is a test metadata value",
        timestamp: new Date().toISOString(),
      },
    })

    // Create a test price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1000,
      currency: "usd",
      metadata: {
        test: "This is a test metadata value",
        timestamp: new Date().toISOString(),
      },
    })

    // Clean up
    await stripe.customers.del(customer.id)
    await stripe.products.del(product.id)

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        metadata: customer.metadata,
      },
      product: {
        id: product.id,
        metadata: product.metadata,
      },
      price: {
        id: price.id,
        metadata: price.metadata,
      },
    })
  } catch (error: any) {
    console.error("Test metadata error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
