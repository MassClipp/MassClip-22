import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"
import { getSiteUrl } from "@/lib/url-utils"

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

    // Use environment-aware URL
    const siteUrl = getSiteUrl()
    console.log(`🌐 [Checkout] Using site URL: ${siteUrl}`)

    // CLIENT-SIDE TEST MODE - Simple success URL without session verification
    const successUrl = `${siteUrl}/purchase-success?product_box_id=${productBoxId}&user_id=${decodedToken.uid}&creator_id=${creatorId || ""}`
    const cancelUrl = `${siteUrl}/product-box/${productBoxId}`

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
      // Simple success URL - no session verification needed
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productBoxId,
        vaultId: productBoxId, // For backward compatibility
        userId: decodedToken.uid,
        buyerUid: decodedToken.uid,
        creatorId: creatorId || "",
        creatorUid: creatorId || "",
        creatorName: creatorData?.displayName || creatorData?.name || "",
        verificationMethod: "client_side_test", // Mark as client-side test
      },
      customer_email: decodedToken.email,
    }

    // Add connected account if provided
    if (connectedAccountId) {
      sessionOptions.stripe_account = connectedAccountId
      console.log(`🔍 [Checkout] Using connected account: ${connectedAccountId}`)
    }

    console.log(`🔗 [Checkout] Success URL: ${successUrl}`)
    console.log(`🔗 [Checkout] Cancel URL: ${cancelUrl}`)
    console.log(`🧪 [Checkout] Using CLIENT-SIDE TEST MODE - no session verification`)

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions)

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
        siteUrl: siteUrl,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
        verificationMethod: "client_side_test",
      })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
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
      environment: {
        siteUrl: siteUrl,
        successUrl: successUrl,
        isPreview: siteUrl.includes("vercel.app") || siteUrl.includes("preview"),
        verificationMethod: "client_side_test",
      },
    })
  } catch (error: any) {
    console.error(`❌ [Checkout] Error creating session:`, error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
