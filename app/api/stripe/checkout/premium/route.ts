import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🛒 [Premium Checkout] Starting premium subscription checkout")

    const { buyerUid, priceId, successUrl, cancelUrl } = await request.json()

    if (!buyerUid) {
      console.error("❌ [Premium Checkout] Missing buyer UID")
      return NextResponse.json({ error: "Buyer UID is required" }, { status: 400 })
    }

    if (!priceId) {
      console.error("❌ [Premium Checkout] Missing price ID")
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    console.log("📋 [Premium Checkout] Request details:", {
      buyerUid,
      priceId,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
    })

    // Get buyer details for customer info
    let customerEmail = null
    let customerName = null
    try {
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (buyerDoc.exists) {
        const buyerData = buyerDoc.data()
        customerEmail = buyerData?.email
        customerName = buyerData?.displayName || buyerData?.name
        console.log("👤 [Premium Checkout] Buyer details found")
      }
    } catch (buyerError) {
      console.warn("⚠️ [Premium Checkout] Could not fetch buyer details:", buyerError)
    }

    // Create Stripe checkout session for subscription
    const sessionData = {
      payment_method_types: ["card"] as const,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription" as const,
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      customer_email: customerEmail || undefined,
      metadata: {
        buyerUid,
        type: "premium_subscription",
        timestamp: new Date().toISOString(),
      },
    }

    console.log("🔧 [Premium Checkout] Creating subscription session:", {
      priceId,
      mode: sessionData.mode,
      hasCustomerEmail: !!sessionData.customer_email,
      metadataKeys: Object.keys(sessionData.metadata),
    })

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log("✅ [Premium Checkout] Subscription session created:", {
      sessionId: session.id,
      sessionType: session.id.startsWith("cs_test_") ? "test" : "live",
      mode: session.mode,
      url: session.url,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      mode: "subscription",
    })
  } catch (error) {
    console.error("❌ [Premium Checkout] Error creating subscription session:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
    })

    return NextResponse.json(
      {
        error: "Failed to create subscription session",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        errorType: error instanceof Error ? error.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
