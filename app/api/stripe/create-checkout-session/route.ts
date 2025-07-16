import { type NextRequest, NextResponse } from "next/server"
import { calculateApplicationFee, createCheckoutSessionWithAccount } from "@/lib/stripe"
import { db, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout] Starting checkout session creation")

    const body = await request.json()
    const { productBoxId, successUrl, cancelUrl } = body

    if (!productBoxId) {
      return NextResponse.json({ error: "Product Box ID is required" }, { status: 400 })
    }

    // Get authenticated user (optional for guest purchases)
    let user = null
    try {
      user = await getAuthenticatedUser(request.headers)
      console.log(`✅ [Checkout] User authenticated: ${user.uid}`)
    } catch (authError) {
      console.log("ℹ️ [Checkout] No authentication - proceeding as guest purchase")
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()
    if (!productBox) {
      return NextResponse.json({ error: "Invalid product box data" }, { status: 400 })
    }

    console.log(`📦 [Checkout] Product box: ${productBox.title} - $${(productBox.price / 100).toFixed(2)}`)

    // Get creator's Stripe account ID
    let connectedAccountId = null
    if (productBox.creatorId) {
      const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
      const creatorData = creatorDoc.data()
      connectedAccountId = creatorData?.stripeAccountId

      if (connectedAccountId) {
        console.log(`🔗 [Checkout] Using connected account: ${connectedAccountId}`)
      }
    }

    // Calculate application fee (25% platform fee)
    const applicationFee = calculateApplicationFee(productBox.price)
    console.log(
      `💰 [Checkout] Price: $${(productBox.price / 100).toFixed(2)}, Platform fee: $${(applicationFee / 100).toFixed(2)}`,
    )

    // Prepare session metadata
    const metadata: Record<string, string> = {
      productBoxId,
      productBoxTitle: productBox.title,
      creatorId: productBox.creatorId || "",
    }

    if (user?.uid) {
      metadata.userId = user.uid
    }
    if (connectedAccountId) {
      metadata.connectedAccountId = connectedAccountId
    }

    // Prepare checkout session parameters
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title,
              description: productBox.description || `Access to ${productBox.title}`,
              images: productBox.thumbnailUrl ? [productBox.thumbnailUrl] : [],
            },
            unit_amount: productBox.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBoxId}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      metadata,
      customer_email: user?.email,
      allow_promotion_codes: true,
    }

    // Add application fee for connected accounts
    if (connectedAccountId && applicationFee > 0) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: connectedAccountId,
        },
      }
    }

    console.log(`🔧 [Checkout] Session params prepared for ${connectedAccountId ? "connected" : "platform"} account`)

    // Create checkout session
    const session = await createCheckoutSessionWithAccount(sessionParams, connectedAccountId)

    console.log(`✅ [Checkout] Session created successfully: ${session.id}`)
    console.log(`🔗 [Checkout] Success URL will be: ${sessionParams.success_url}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      success: true,
    })
  } catch (error: any) {
    console.error("❌ [Checkout] Session creation failed:", error)

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
        success: false,
      },
      { status: 500 },
    )
  }
}
