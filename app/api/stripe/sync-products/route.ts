import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("🔍 [Stripe Sync] Syncing products for user:", userId)

    // Get user's Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Stripe account not connected" }, { status: 400 })
    }

    // Get all products from Stripe
    const stripeProducts = await stripe.products.list(
      {
        active: true,
        expand: ["data.default_price"],
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log(`✅ [Stripe Sync] Found ${stripeProducts.data.length} products in Stripe`)

    return NextResponse.json({
      success: true,
      products: stripeProducts.data,
      message: `Found ${stripeProducts.data.length} products in your Stripe account`,
    })
  } catch (error) {
    console.error("❌ [Stripe Sync] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to sync products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
