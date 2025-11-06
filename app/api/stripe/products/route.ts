import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getServerSession } from "@/lib/server-session"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Stripe account ID
    const userDoc = await getDoc(doc(db, "users", session.uid))
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Stripe account not connected" }, { status: 400 })
    }

    // Get products from Stripe
    const products = await stripe.products.list(
      {
        active: true,
        expand: ["data.default_price"],
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    return NextResponse.json({ products: products.data })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, price, currency = "usd", type = "one_time" } = await request.json()

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    // Get user's Stripe account ID
    const userDoc = await getDoc(doc(db, "users", session.uid))
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Stripe account not connected" }, { status: 400 })
    }

    // Create product in Stripe
    const product = await stripe.products.create(
      {
        name,
        description,
        metadata: {
          creator_id: session.uid,
          type: "premium_content",
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    // Create price for the product
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency,
      metadata: {
        creator_id: session.uid,
      },
    }

    if (type === "subscription") {
      priceData.recurring = { interval: "month" }
    }

    const priceObject = await stripe.prices.create(priceData, {
      stripeAccount: stripeAccountId,
    })

    // Update product with default price
    await stripe.products.update(
      product.id,
      {
        default_price: priceObject.id,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    return NextResponse.json({
      product: {
        ...product,
        default_price: priceObject,
      },
    })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
