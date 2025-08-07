import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { auth } from "firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { bundleId, successUrl, cancelUrl, buyerEmail, buyerName } = await request.json()

    console.log("💳 [Stripe] Creating checkout session for bundle:", bundleId)

    // Verify authentication if token provided
    let buyerId = null
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth().verifyIdToken(idToken)
        buyerId = decodedToken.uid
        console.log("✅ [Stripe] Authenticated user:", buyerId)
      } catch (authError) {
        console.error("❌ [Stripe] Auth verification failed:", authError)
        return NextResponse.json(
          { error: "Invalid authentication token" },
          { status: 401 }
        )
      }
    }

    if (!bundleId) {
      return NextResponse.json(
        { error: "Bundle ID is required" },
        { status: 400 }
      )
    }

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    
    if (!bundleDoc.exists) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    const bundleData = bundleDoc.data()!
    console.log("📦 [Stripe] Bundle data:", {
      title: bundleData.title,
      price: bundleData.price,
      creatorId: bundleData.creatorId,
    })

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId) {
      return NextResponse.json(
        { error: "Creator has not connected their Stripe account" },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: bundleData.title,
              description: `Premium content bundle by ${creatorData.displayName || creatorData.username}`,
            },
            unit_amount: Math.round(bundleData.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: buyerEmail,
      metadata: {
        bundleId,
        creatorId: bundleData.creatorId,
        buyerId: buyerId || "anonymous",
        buyerEmail: buyerEmail || "",
        buyerName: buyerName || "",
      },
      payment_intent_data: {
        application_fee_amount: Math.round(bundleData.price * 100 * 0.1), // 10% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          bundleId,
          creatorId: bundleData.creatorId,
          buyerId: buyerId || "anonymous",
        },
      },
    })

    console.log("✅ [Stripe] Checkout session created:", session.id)

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error("❌ [Stripe] Checkout session creation failed:", error)
    
    let errorMessage = "Failed to create checkout session"
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
