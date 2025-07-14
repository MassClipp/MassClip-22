import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, calculateApplicationFee } from "@/lib/stripe"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { idToken, productBoxId, priceInCents, connectedAccountId } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
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

    // Validate connected account if provided
    if (connectedAccountId) {
      try {
        const account = await stripe.accounts.retrieve(connectedAccountId)
        if (!account.charges_enabled) {
          return NextResponse.json(
            {
              error: "Connected account cannot accept charges",
            },
            { status: 400 },
          )
        }
        console.log(`✅ [Checkout] Using connected account: ${connectedAccountId}`)
      } catch (error) {
        console.error("❌ [Checkout] Invalid connected account:", error)
        return NextResponse.json(
          {
            error: "Invalid connected account",
          },
          { status: 400 },
        )
      }
    }

    // Calculate application fee (25% platform fee)
    const applicationFee = calculateApplicationFee(priceInCents)

    console.log(`💳 [Checkout] Creating session:`, {
      productBoxId,
      priceInCents,
      applicationFee,
      connectedAccountId,
      mode: isTestMode ? "test" : "live",
    })

    // Create checkout session
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Product Box ${productBoxId}`,
              metadata: {
                productBoxId,
                userId,
              },
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      metadata: {
        productBoxId,
        userId,
        connectedAccountId: connectedAccountId || "",
        environment: isTestMode ? "test" : "live",
      },
    }

    // Add application fee if using connected account
    if (connectedAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
      }
    }

    // Create session with or without connected account context
    let session
    if (connectedAccountId) {
      session = await stripe.checkout.sessions.create(sessionParams, {
        stripeAccount: connectedAccountId,
      })
    } else {
      session = await stripe.checkout.sessions.create(sessionParams)
    }

    console.log(`✅ [Checkout] Session created: ${session.id}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error("❌ [Checkout] Session creation failed:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
