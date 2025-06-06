import { NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase/firebaseAdmin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16", // Use the latest API version
})

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { creatorId, displayName, priceInDollars, mode, enablePremium } = body

    // Validate required fields
    if (!creatorId || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the creator's document reference
    const creatorRef = db.collection("users").doc(creatorId)

    // If premium is being disabled, update Firestore and return early
    if (!enablePremium) {
      await creatorRef.update({
        premiumEnabled: false,
        // Keep the existing product and price IDs in case they want to re-enable
      })

      return NextResponse.json({ success: true, premiumEnabled: false })
    }

    // Validate price for premium content
    if (!priceInDollars || isNaN(Number(priceInDollars)) || Number(priceInDollars) <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 })
    }

    // Create a Stripe product
    const product = await stripe.products.create({
      name: `Premium Content by ${displayName}`,
      metadata: {
        creatorId,
      },
    })

    // Create a Stripe price
    const priceOptions: Stripe.PriceCreateParams = {
      unit_amount: Math.round(Number(priceInDollars) * 100), // Convert to cents
      currency: "usd",
      product: product.id,
    }

    // Add recurring parameters if subscription mode
    if (mode === "subscription") {
      priceOptions.recurring = { interval: "month" }
    }

    const price = await stripe.prices.create(priceOptions)

    // Update the creator's document in Firestore
    await creatorRef.update({
      stripeProductId: product.id,
      stripePriceId: price.id,
      premiumPrice: Number(priceInDollars),
      paymentMode: mode,
      premiumEnabled: true,
      updatedAt: new Date().toISOString(),
    })

    // Return success response with the created IDs
    return NextResponse.json({
      success: true,
      productId: product.id,
      priceId: price.id,
      premiumEnabled: true,
    })
  } catch (error) {
    console.error("Error creating Stripe product:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
