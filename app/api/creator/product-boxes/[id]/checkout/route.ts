import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🛒 [Checkout] === STARTING CHECKOUT PROCESS ===`)
  console.log(`🛒 [Checkout] Product Box ID: ${params.id}`)

  try {
    // Import dependencies
    const { db, verifyIdToken } = await import("@/lib/firebase-admin")
    const { stripe } = await import("@/lib/stripe")

    // Validate auth
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await req.json()
    const { successUrl, cancelUrl } = body

    // Get product box
    const productBoxDoc = await db.collection("productBoxes").doc(params.id).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Checkout] Product box not found: ${params.id}`)
      return new NextResponse("Product box not found", { status: 404 })
    }

    const productBox = productBoxDoc.data()
    console.log(`✅ [Checkout] Product box data:`, {
      id: params.id,
      title: productBox?.title,
      price: productBox?.price,
      active: productBox?.active,
      creatorId: productBox?.creatorId,
      hasDescription: !!productBox?.description,
    })

    // Validate required fields
    if (!productBox?.title) {
      console.error(`❌ [Checkout] Product box missing title: ${params.id}`)
      return new NextResponse("Product box missing required data", { status: 400 })
    }

    if (!productBox?.price || typeof productBox.price !== "number") {
      console.error(`❌ [Checkout] Product box invalid price: ${params.id}`, productBox?.price)
      return new NextResponse("Product box has invalid price", { status: 400 })
    }

    if (!productBox?.creatorId) {
      console.error(`❌ [Checkout] Product box missing creator: ${params.id}`)
      return new NextResponse("Product box missing creator", { status: 400 })
    }

    if (productBox.active === false) {
      console.error(`❌ [Checkout] Product box not active: ${params.id}`)
      return new NextResponse("Product box is not active", { status: 400 })
    }

    // Get creator
    const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`❌ [Checkout] Creator not found: ${productBox.creatorId}`)
      return new NextResponse("Creator not found", { status: 404 })
    }

    const creatorData = creatorDoc.data()
    console.log(`✅ [Checkout] Creator data:`, {
      id: productBox.creatorId,
      username: creatorData?.username,
      displayName: creatorData?.displayName,
      hasStripeAccount: !!creatorData?.stripeAccountId,
    })

    if (!creatorData?.stripeAccountId) {
      console.error(`❌ [Checkout] Creator missing Stripe account: ${productBox.creatorId}`)
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    // Validate environment
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ [Checkout] STRIPE_SECRET_KEY not configured")
      return new NextResponse("Payment system not configured", { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error("❌ [Checkout] NEXT_PUBLIC_SITE_URL not configured")
      return new NextResponse("Site URL not configured", { status: 500 })
    }

    // Create checkout session with proper error handling
    console.log(`🔄 [Checkout] Creating Stripe session...`)

    const sessionData = {
      mode: "payment" as const,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title,
              description:
                productBox.description ||
                `Product box by ${creatorData.username || creatorData.displayName || "Creator"}`,
            },
            unit_amount: Math.round(productBox.price), // Ensure it's an integer
          },
          quantity: 1,
        },
      ],
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${params.id}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username || "unknown"}`,
      metadata: {
        productBoxId: params.id,
        buyerUid: userId,
        creatorUid: productBox.creatorId,
        type: "product_box_purchase",
      },
    }

    console.log(`🔄 [Checkout] Session data prepared:`, {
      amount: sessionData.line_items[0].price_data.unit_amount,
      productName: sessionData.line_items[0].price_data.product_data.name,
      hasDescription: !!sessionData.line_items[0].price_data.product_data.description,
    })

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log(`✅ [Checkout] Session created successfully: ${session.id}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("❌ [CHECKOUT] CRITICAL ERROR:", error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error("❌ [CHECKOUT] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 5), // First 5 lines of stack
      })
    }

    // Check if it's a Stripe error
    if (error && typeof error === "object" && "type" in error) {
      console.error("❌ [CHECKOUT] Stripe error details:", {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
      })
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return new NextResponse(`Checkout failed: ${errorMessage}`, { status: 500 })
  }
}
