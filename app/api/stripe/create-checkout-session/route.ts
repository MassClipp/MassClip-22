import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, calculateApplicationFee, validateConnectedAccount } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, idToken, successUrl, cancelUrl } = await request.json()

    if (!productBoxId || !idToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Checkout] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Checkout] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(
      `🛒 [Checkout] Creating session for product box: ${productBoxId} (${isTestMode ? "TEST" : "LIVE"} mode)`,
    )

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    const creatorId = productBox.creatorId

    // Get creator's connected account
    const creatorDoc = await db.collection("users").doc(creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const connectedAccountId = isTestMode ? creatorData.stripeTestAccountId : creatorData.stripeAccountId

    if (!connectedAccountId) {
      return NextResponse.json({ error: "Creator has not connected their Stripe account" }, { status: 400 })
    }

    // Validate connected account
    const isValidAccount = await validateConnectedAccount(connectedAccountId)
    if (!isValidAccount) {
      return NextResponse.json({ error: "Creator's Stripe account is invalid" }, { status: 400 })
    }

    console.log(`✅ [Checkout] Using connected account: ${connectedAccountId}`)

    // Calculate amounts
    const priceInCents = Math.round(productBox.price * 100)
    const applicationFee = calculateApplicationFee(priceInCents)

    console.log(`💰 [Checkout] Price: $${productBox.price}, Application Fee: $${applicationFee / 100}`)

    // Create checkout session with connected account
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: productBox.title,
                description: productBox.description || `Premium content bundle from ${creatorData.username}`,
                images: productBox.thumbnailUrl ? [productBox.thumbnailUrl] : [],
                metadata: {
                  productBoxId,
                  creatorId,
                  environment: isTestMode ? "test" : "live",
                },
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url:
          successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
        customer_email: decodedToken.email,
        payment_intent_data: {
          application_fee_amount: applicationFee,
          metadata: {
            productBoxId,
            creatorId,
            buyerId: userId,
            environment: isTestMode ? "test" : "live",
            connectedAccountId,
          },
        },
        metadata: {
          productBoxId,
          creatorId,
          buyerId: userId,
          environment: isTestMode ? "test" : "live",
          connectedAccountId,
        },
      },
      {
        stripeAccount: connectedAccountId,
      },
    )

    console.log(`✅ [Checkout] Created session: ${session.id} for connected account: ${connectedAccountId}`)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      connectedAccountId,
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [Checkout] Session creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
