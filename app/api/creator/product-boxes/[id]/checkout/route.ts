import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: productBoxId } = params
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🛒 [Checkout] Creating checkout for product box ${productBoxId} by user ${userId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()
    if (!productBox) {
      return NextResponse.json({ error: "Product box data not found" }, { status: 404 })
    }

    // Get creator details
    const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creator = creatorDoc.data()
    if (!creator?.stripeConnectedAccountId) {
      return NextResponse.json({ error: "Creator has not connected Stripe account" }, { status: 400 })
    }

    // Validate price meets Stripe minimums
    const price = productBox.price || 0
    const currency = (productBox.currency || "USD").toLowerCase()

    // Stripe minimum amounts (in cents)
    const minimums: { [key: string]: number } = {
      usd: 50, // $0.50
      eur: 50, // €0.50
      gbp: 30, // £0.30
      cad: 50, // $0.50 CAD
      aud: 50, // $0.50 AUD
      jpy: 50, // ¥50
      chf: 50, // 0.50 CHF
      sek: 3, // 3.00 SEK
      nok: 3, // 3.00 NOK
      dkk: 2.5, // 2.50 DKK
    }

    const minimumAmount = minimums[currency] || 50
    const priceInCents = Math.round(price * 100)

    if (priceInCents < minimumAmount) {
      const minimumFormatted = (minimumAmount / 100).toFixed(2)
      return NextResponse.json(
        {
          error: `Minimum charge amount is $${minimumFormatted} ${currency.toUpperCase()}`,
          minimum: minimumAmount,
          provided: priceInCents,
          currency: currency.toUpperCase(),
        },
        { status: 400 },
      )
    }

    // Get user details
    const userDoc = await db.collection("users").doc(userId).get()
    const user = userDoc.data()

    // Calculate application fee (10% of the total)
    const applicationFeeAmount = Math.round(priceInCents * 0.1)

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.com"
    const successUrl = `${baseUrl}/api/purchase/convert-session-to-payment-intent?session_id={CHECKOUT_SESSION_ID}&account_id=${creator.stripeConnectedAccountId}`
    const cancelUrl = `${baseUrl}/creator/${creator.username || creator.id}`

    console.log(`💰 [Checkout] Price: ${priceInCents} cents, Fee: ${applicationFeeAmount} cents`)
    console.log(`🔗 [Checkout] Success URL: ${successUrl}`)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: productBox.title,
                description: productBox.description || `Premium content from ${creator.name || creator.username}`,
                images: productBox.thumbnailUrl ? [productBox.thumbnailUrl] : [],
                metadata: {
                  product_box_id: productBoxId,
                  creator_id: productBox.creatorId,
                  creator_username: creator.username || creator.id,
                },
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user?.email || decodedToken.email,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            product_box_id: productBoxId,
            creator_id: productBox.creatorId,
            buyer_id: userId,
            creator_username: creator.username || creator.id,
            product_title: productBox.title,
          },
        },
        metadata: {
          product_box_id: productBoxId,
          creator_id: productBox.creatorId,
          buyer_id: userId,
          creator_username: creator.username || creator.id,
          product_title: productBox.title,
        },
      },
      {
        stripeAccount: creator.stripeConnectedAccountId,
      },
    )

    console.log(`✅ [Checkout] Session created: ${session.id}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      success: true,
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
