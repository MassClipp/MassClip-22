import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🛒 [Checkout] Starting checkout process for product box:", params.id)

    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Checkout] No auth header provided")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const buyerUid = decodedToken.uid
    const productBoxId = params.id

    console.log("✅ [Checkout] Authenticated user:", buyerUid)
    console.log("🎯 [Checkout] Product box ID:", productBoxId)

    const { successUrl, cancelUrl } = await request.json()

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        {
          error: "Missing required URLs",
        },
        { status: 400 },
      )
    }

    console.log("🔗 [Checkout] URLs validated")

    // Get product box details from Firestore
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      console.error("❌ [Checkout] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log("📦 [Checkout] Product box data:", {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
    })

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.data()

    if (!creatorData?.stripeAccountId) {
      console.error("❌ [Checkout] Creator has no Stripe account:", productBoxData.creatorId)
      return NextResponse.json({ error: "Creator payment setup incomplete" }, { status: 400 })
    }

    console.log("💳 [Checkout] Creator Stripe account:", creatorData.stripeAccountId)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: productBoxData.currency || "usd",
            product_data: {
              name: productBoxData.title,
              description: productBoxData.description || undefined,
            },
            unit_amount: Math.round(productBoxData.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: productBoxData.type === "subscription" ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productBoxId,
        buyerUid,
        creatorId: productBoxData.creatorId,
      },
      payment_intent_data: {
        application_fee_amount: Math.round(productBoxData.price * 100 * 0.1), // 10% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
      },
    })

    console.log("✅ [Checkout] Stripe session created:", session.id)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error("🔥 [Checkout] Error during checkout:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
