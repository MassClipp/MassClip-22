import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🛒 [Checkout] Starting checkout for product box: ${params.id}`)

    const decodedToken = await verifyIdToken(request)
    let userId = null
    let isGuestCheckout = false

    if (decodedToken) {
      userId = decodedToken.uid
      console.log(`✅ [Checkout] User authenticated: ${userId}`)
    } else {
      // Allow guest checkout
      isGuestCheckout = true
      console.log(`👤 [Checkout] Guest checkout initiated`)
    }

    // Get bundle details - use bundles collection
    const bundleDoc = await db.collection("bundles").doc(params.id).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Checkout] Bundle not found: ${params.id}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Checkout] Found bundle:`, {
      title: bundleData.title,
      price: bundleData.price,
      currency: bundleData.currency,
      creatorId: bundleData.creatorId,
    })

    // Validate price meets minimums
    const price = bundleData.price || 0
    const currency = (bundleData.currency || "usd").toLowerCase()

    const minimums: { [key: string]: number } = {
      usd: 0.5,
      eur: 0.5,
      gbp: 0.3,
      cad: 0.5,
      aud: 0.5,
    }

    const minimum = minimums[currency] || 0.5
    if (price < minimum) {
      console.error(`❌ [Checkout] Price ${price} below minimum ${minimum} for ${currency}`)
      return NextResponse.json(
        {
          error: `Minimum charge amount is ${minimum.toFixed(2)} ${currency.toUpperCase()}`,
          minimum,
          currency: currency.toUpperCase(),
        },
        { status: 400 },
      )
    }

    // Get creator data
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`❌ [Checkout] Creator not found: ${bundleData.creatorId}`)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    console.log(`✅ [Checkout] Creator found: ${creatorData.username || creatorData.name}`)

    // Check if creator has Stripe account
    if (!creatorData.stripeAccountId) {
      console.error(`❌ [Checkout] Creator has no Stripe account`)
      return NextResponse.json({ error: "Creator payment setup incomplete" }, { status: 400 })
    }

    // Fix domain configuration - use the correct domain
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://massclip.pro"

    let successUrl: string
    let cancelUrl: string

    if (isGuestCheckout) {
      // For guest checkout, redirect to a guest success page
      successUrl = `${baseUrl}/purchase-success-guest?product_box_id=${params.id}&creator_id=${bundleData.creatorId}&session_id={CHECKOUT_SESSION_ID}`
      cancelUrl = `${baseUrl}/creator/${creatorData.username || bundleData.creatorId}`
    } else {
      // Existing authenticated user flow
      successUrl = `${baseUrl}/purchase-success?product_box_id=${params.id}&user_id=${userId}&creator_id=${bundleData.creatorId}`
      cancelUrl = `${baseUrl}/creator/${creatorData.username || bundleData.creatorId}`
    }

    console.log(`🔗 [Checkout] Success URL: ${successUrl}`)
    console.log(`🔗 [Checkout] Cancel URL: ${cancelUrl}`)

    const metadata = {
      bundle_id: params.id,
      product_box_id: params.id,
      creator_id: bundleData.creatorId,
      verification_method: "landing_page",
      contentType: "bundle",
      ...(userId ? { buyer_user_id: userId } : { is_guest_checkout: "true" }),
    }

    const sessionParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: bundleData.title || "Premium Bundle",
              description: bundleData.description || `Premium bundle from ${creatorData.username || creatorData.name}`,
              images: bundleData.thumbnailUrl ? [bundleData.thumbnailUrl] : [],
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId || "guest",
      metadata,
      ...(isGuestCheckout
        ? {
            customer_email: undefined, // Let Stripe collect email
            billing_address_collection: "required",
          }
        : {}),
      payment_intent_data: {
        application_fee_amount: Math.round(price * 100 * 0.1), // 10% platform fee
        metadata,
      },
    }

    console.log(`💰 [Checkout] Creating session with price: ${price} ${currency}`)

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: creatorData.stripeAccountId,
    })

    console.log(`✅ [Checkout] Session created successfully: ${session.id}`)
    console.log(`🔗 [Checkout] Checkout URL: ${session.url}`)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      productBox: {
        id: params.id,
        title: bundleData.title,
        price: price,
        currency: currency,
      },
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Checkout] GET request for product box: ${params.id}`)

    // This allows guests to view bundle details before purchase

    // Get product box data
    let productBoxDoc = await db.collection("productBoxes").doc(params.id).get()

    if (!productBoxDoc.exists) {
      productBoxDoc = await db.collection("bundles").doc(params.id).get()
    }

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    return NextResponse.json({
      success: true,
      productBox: {
        id: params.id,
        title: productBoxData.title,
        description: productBoxData.description,
        price: productBoxData.price,
        currency: productBoxData.currency || "usd",
        active: productBoxData.active !== false,
        creatorId: productBoxData.creatorId,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Checkout] GET error:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
