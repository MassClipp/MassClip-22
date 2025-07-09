import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const productBoxId = params.id

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    const price = productBoxData.price || 0
    const currency = productBoxData.currency || "usd"
    const creatorId = productBoxData.creatorId

    // Validate minimum amounts based on currency
    const minimums: { [key: string]: number } = {
      usd: 0.5, // $0.50
      eur: 0.5, // €0.50
      gbp: 0.3, // £0.30
      cad: 0.5, // CAD $0.50
      aud: 0.5, // AUD $0.50
    }

    const minimum = minimums[currency.toLowerCase()] || 0.5
    if (price < minimum) {
      return NextResponse.json(
        {
          error: `Minimum charge amount is ${minimum.toFixed(2)} ${currency.toUpperCase()}`,
          minimum,
          currency: currency.toUpperCase(),
        },
        { status: 400 },
      )
    }

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Creator has not connected Stripe account" }, { status: 400 })
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || ""

    // Simple success URL that includes the product box ID - no complex verification needed
    const successUrl = `${baseUrl}/purchase-success?product_box_id=${productBoxId}&user_id=${userId}`
    const cancelUrl = `${baseUrl}/creator/${creatorData.username || creatorId}`

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: productBoxData.title || "Premium Content",
                description: productBoxData.description || "",
                images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : [],
              },
              unit_amount: Math.round(price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          product_box_id: productBoxId,
          buyer_user_id: userId,
          creator_id: creatorId,
        },
        payment_intent_data: {
          application_fee_amount: Math.round(price * 100 * 0.1), // 10% platform fee
          metadata: {
            product_box_id: productBoxId,
            buyer_user_id: userId,
            creator_id: creatorId,
          },
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log(`✅ [Checkout] Created session ${session.id} for product box ${productBoxId}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error(`❌ [Checkout] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
