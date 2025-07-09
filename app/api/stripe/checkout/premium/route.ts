import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const { priceId, creatorId, successUrl, cancelUrl } = await request.json()

    console.log("🛒 [Premium Checkout] Starting checkout session creation:", {
      priceId,
      creatorId,
      successUrl,
      cancelUrl,
    })

    if (!priceId || !creatorId) {
      return NextResponse.json({ error: "Price ID and creator ID are required" }, { status: 400 })
    }

    // Get creator's Stripe account ID
    const creatorDoc = await getDoc(doc(db, "users", creatorId))
    if (!creatorDoc.exists()) {
      console.error("❌ [Premium Checkout] Creator not found:", creatorId)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      console.error("❌ [Premium Checkout] Creator's Stripe account not connected:", creatorId)
      return NextResponse.json({ error: "Creator's Stripe account not connected" }, { status: 400 })
    }

    console.log("✅ [Premium Checkout] Creator found with Stripe account:", {
      creatorId,
      stripeAccountId: stripeAccountId.substring(0, 10) + "...",
      username: creatorData.username,
    })

    // Get the price from the Stripe price object
    const priceObj = await stripe.prices.retrieve(priceId)
    const amount = priceObj.unit_amount || 0

    console.log("💰 [Premium Checkout] Price details:", {
      priceId,
      amount,
      currency: priceObj.currency,
    })

    // Calculate 25% platform fee
    const applicationFee = Math.round(amount * 0.25)

    console.log("🧮 [Premium Checkout] Fee calculation:", {
      totalAmount: amount,
      platformFee: applicationFee,
      creatorAmount: amount - applicationFee,
      feePercentage: "25%",
    })

    // Create checkout session - FORCE live mode by using live keys
    const sessionData = {
      mode: "payment" as const,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
      metadata: {
        creator_id: creatorId,
        price_id: priceId,
        checkout_type: "premium_content",
      },
      payment_intent_data: {
        application_fee_amount: applicationFee, // 25% platform fee
        metadata: {
          creator_id: creatorId,
          platformFeeAmount: applicationFee.toString(),
          creatorAmount: (amount - applicationFee).toString(),
          checkout_type: "premium_content",
        },
      },
    }

    console.log("🔄 [Premium Checkout] Creating Stripe session with data:", {
      mode: sessionData.mode,
      lineItems: sessionData.line_items.length,
      stripeAccount: stripeAccountId.substring(0, 10) + "...",
      applicationFee,
    })

    const session = await stripe.checkout.sessions.create(sessionData, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Premium Checkout] Session created successfully:", {
      sessionId: session.id,
      sessionMode: session.mode,
      url: session.url ? "Generated" : "Missing",
      stripeAccount: stripeAccountId.substring(0, 10) + "...",
    })

    // Verify session was created with live keys
    if (session.id.startsWith("cs_test_")) {
      console.error("❌ [Premium Checkout] ERROR: Created test session when live was expected!")
      console.error("❌ [Premium Checkout] Session ID:", session.id)
      console.error("❌ [Premium Checkout] This indicates test keys are being used instead of live keys")
    } else if (session.id.startsWith("cs_live_")) {
      console.log("🎉 [Premium Checkout] SUCCESS: Created live session as expected!")
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      mode: session.mode,
    })
  } catch (error) {
    console.error("❌ [Premium Checkout] Error creating checkout session:", error)

    // Enhanced error logging
    if (error instanceof Error) {
      console.error("❌ [Premium Checkout] Error details:", {
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 3),
      })
    }

    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
