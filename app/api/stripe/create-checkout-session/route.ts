import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await requireAuth(request)
    const { productBoxId, connectedAccountId } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Missing productBoxId" }, { status: 400 })
    }

    console.log(`🔍 [Checkout] Creating session for product ${productBoxId}, user ${decodedToken.uid}`)

    // Get product details
    const productDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productData = productDoc.data()!
    const price = productData.price || 0

    if (price <= 0) {
      return NextResponse.json({ error: "Invalid product price" }, { status: 400 })
    }

    // Get creator details
    const creatorId = productData.creatorId
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Prepare checkout session options
    const sessionOptions: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productData.title || "Digital Content",
              description: productData.description || "Premium digital content access",
              images: productData.thumbnailUrl ? [productData.thumbnailUrl] : [],
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?payment_intent={CHECKOUT_SESSION_ID}&account_id=${connectedAccountId || ""}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      metadata: {
        productBoxId,
        vaultId: productBoxId, // For backward compatibility
        userId: decodedToken.uid,
        creatorId: creatorId || "",
        creatorName: creatorData?.displayName || creatorData?.name || "",
      },
      customer_email: decodedToken.email,
    }

    // Add connected account if provided
    if (connectedAccountId) {
      sessionOptions.stripe_account = connectedAccountId
      console.log(`🔍 [Checkout] Using connected account: ${connectedAccountId}`)
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions)

    // Retrieve the session to get the payment intent
    const sessionWithPaymentIntent = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["payment_intent"],
    })

    // Update the success URL to include the payment intent ID
    const paymentIntentId =
      typeof sessionWithPaymentIntent.payment_intent === "string"
        ? sessionWithPaymentIntent.payment_intent
        : sessionWithPaymentIntent.payment_intent?.id

    console.log(`✅ [Checkout] Session created: ${session.id}`)

    // Store checkout session for tracking
    await db
      .collection("stripeCheckoutSessions")
      .doc(session.id)
      .set({
        sessionId: session.id,
        userId: decodedToken.uid,
        productBoxId,
        vaultId: productBoxId,
        creatorId: creatorId || "",
        connectedAccountId: connectedAccountId || null,
        amount: price,
        currency: "usd",
        status: "pending",
        createdAt: new Date(),
        metadata: sessionOptions.metadata,
      })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      // Override the success URL to use payment intent
      customSuccessUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?payment_intent=${paymentIntentId}&account_id=${connectedAccountId || ""}`,
      productBox: {
        id: productBoxId,
        title: productData.title,
        price: price,
      },
      creator: creatorData
        ? {
            id: creatorId,
            name: creatorData.displayName || creatorData.name,
            username: creatorData.username,
          }
        : null,
    })
  } catch (error: any) {
    console.error(`❌ [Checkout] Error creating session:`, error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
