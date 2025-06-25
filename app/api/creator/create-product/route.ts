import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { getServerSession } from "@/lib/server-session"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔥 Starting product creation...")

    // Get authenticated user
    const session = await getServerSession()
    console.log("🔥 Session check:", session ? "Found" : "Not found")

    if (!session?.uid) {
      console.log("❌ No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("🔥 Request body:", body)

    const { name, description, price, currency = "usd", type } = body

    // Validate required fields
    if (!name || !price || !type) {
      console.log("❌ Missing required fields:", { name: !!name, price: !!price, type: !!type })
      return NextResponse.json({ error: "Name, price, and billing type are required" }, { status: 400 })
    }

    // Validate price (minimum $0.50 for Stripe)
    const priceInDollars = Number.parseFloat(price)
    if (isNaN(priceInDollars) || priceInDollars < 0.5 || priceInDollars > 999.99) {
      console.log("❌ Invalid price:", priceInDollars)
      return NextResponse.json({ error: "Price must be between $0.50 and $999.99" }, { status: 400 })
    }

    // Validate currency (USD only for now)
    if (currency !== "usd") {
      console.log("❌ Invalid currency:", currency)
      return NextResponse.json({ error: "Only USD currency is supported" }, { status: 400 })
    }

    // Validate billing type
    if (!["one_time", "subscription"].includes(type)) {
      console.log("❌ Invalid billing type:", type)
      return NextResponse.json({ error: "Invalid billing type" }, { status: 400 })
    }

    console.log("✅ All validations passed")

    // Get user's Stripe account ID using Firebase Admin SDK
    console.log("🔥 Fetching user document for UID:", session.uid)
    const userDoc = await db.collection("users").doc(session.uid).get()

    if (!userDoc.exists) {
      console.log("❌ User document not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    console.log("🔥 User data:", {
      hasStripeAccountId: !!userData?.stripeAccountId,
      chargesEnabled: userData?.chargesEnabled,
      payoutsEnabled: userData?.payoutsEnabled,
    })

    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log("❌ No Stripe account connected")
      return NextResponse.json(
        { error: "Stripe account not connected. Please connect your Stripe account first." },
        { status: 400 },
      )
    }

    // Check if Stripe account is properly set up
    if (!userData?.chargesEnabled || !userData?.payoutsEnabled) {
      console.log("❌ Stripe account setup incomplete")
      return NextResponse.json(
        { error: "Stripe account setup incomplete. Please complete your Stripe onboarding." },
        { status: 400 },
      )
    }

    // Convert price to cents for Stripe
    const priceInCents = Math.round(priceInDollars * 100)
    console.log("🔥 Price in cents:", priceInCents)

    // Create Stripe Product
    console.log("🔥 Creating Stripe product...")
    const product = await stripe.products.create(
      {
        name,
        description: description || undefined,
        metadata: {
          creator_id: session.uid,
          type: "premium_content",
          created_via: "massclip_dashboard",
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )
    console.log("✅ Stripe product created:", product.id)

    // Create Stripe Price
    console.log("🔥 Creating Stripe price...")
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: priceInCents,
      currency: currency.toLowerCase(),
      metadata: {
        creator_id: session.uid,
        billing_type: type,
      },
    }

    // Add recurring interval for subscriptions
    if (type === "subscription") {
      priceData.recurring = { interval: "month" }
    }

    const priceObject = await stripe.prices.create(priceData, {
      stripeAccount: stripeAccountId,
    })
    console.log("✅ Stripe price created:", priceObject.id)

    // Update product with default price
    console.log("🔥 Updating product with default price...")
    await stripe.products.update(
      product.id,
      {
        default_price: priceObject.id,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )
    console.log("✅ Product updated with default price")

    // Save to Firestore using Firebase Admin SDK
    console.log("🔥 Saving to Firestore...")
    const premiumSettingsData = {
      productId: product.id,
      priceId: priceObject.id,
      currency: currency.toLowerCase(),
      amount: priceInDollars,
      amountInCents: priceInCents,
      billingType: type,
      name,
      description: description || null,
      stripeAccountId,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("users").doc(session.uid).collection("premiumSettings").doc("product").set(premiumSettingsData)
    console.log("✅ Saved to Firestore")

    // Also update the main user document with premium settings flag
    console.log("🔥 Updating user document...")
    await db.collection("users").doc(session.uid).update({
      hasPremiumContent: true,
      premiumContentUpdatedAt: new Date(),
    })
    console.log("✅ User document updated")

    console.log("🎉 Product creation completed successfully!")

    return NextResponse.json({
      success: true,
      productId: product.id,
      priceId: priceObject.id,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        default_price: {
          id: priceObject.id,
          unit_amount: priceObject.unit_amount,
          currency: priceObject.currency,
          recurring: priceObject.recurring,
        },
      },
    })
  } catch (error) {
    console.error("❌ Error creating premium product:", error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("❌ Error name:", error.name)
      console.error("❌ Error message:", error.message)
      console.error("❌ Error stack:", error.stack)
    }

    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      console.error("❌ Stripe error type:", error.type)
      console.error("❌ Stripe error code:", error.code)
      console.error("❌ Stripe error message:", error.message)

      return NextResponse.json(
        {
          error: `Stripe error: ${error.message}`,
          type: error.type,
          code: error.code,
        },
        { status: 400 },
      )
    }

    // Handle Firebase errors
    if (error instanceof Error && error.message.includes("Firebase")) {
      console.error("❌ Firebase error:", error.message)
      return NextResponse.json(
        {
          error: `Database error: ${error.message}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create premium product. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
