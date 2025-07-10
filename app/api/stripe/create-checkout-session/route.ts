import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"
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

    console.log(`🔍 [Checkout] Creating ${isTestMode ? "TEST" : "LIVE"} session for product ${productBoxId}`)
    console.log(`👤 [Checkout] User: ${decodedToken.uid}`)

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

    // Create success URL that preserves authentication
    const successUrl = `${siteUrl}/purchase-success?product_box_id=${productBoxId}&user_id=${decodedToken.uid}&creator_id=${creatorId || ""}&test_mode=${isTestMode}`
    const cancelUrl = `${siteUrl}/product-box/${productBoxId}`

    console.log(`🔗 [Checkout] Success URL: ${successUrl}`)
    console.log(`🔗 [Checkout] Cancel URL: ${cancelUrl}`)

    // Prepare checkout session options
    const sessionOptions: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${isTestMode ? "[TEST] " : ""}${productData.title || "Digital Content"}`,
              description: `${isTestMode ? "TEST MODE: " : ""}${productData.description || "Premium digital content access"}`,
              images: productData.thumbnailUrl ? [productData.thumbnailUrl] : [],
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productBoxId,
        vaultId: productBoxId,
        userId: decodedToken.uid,
        buyerUid: decodedToken.uid,
        creatorId: creatorId || "",
        creatorUid: creatorId || "",
        creatorName: creatorData?.displayName || creatorData?.name || "",
        verificationMethod: "landing_page_immediate",
        testMode: isTestMode.toString(),
        userEmail: decodedToken.email || "",
      },
      customer_email: decodedToken.email,
      // Add client reference ID to help with verification
      client_reference_id: decodedToken.uid,
    }

    // Force test mode - don't use connected accounts in test mode
    if (isTestMode) {
      console.log(`🧪 [Checkout] FORCING TEST MODE - skipping connected account`)
    } else if (connectedAccountId) {
      sessionOptions.stripe_account = connectedAccountId
      console.log(`🔍 [Checkout] Using connected account: ${connectedAccountId}`)
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions)

    console.log(`✅ [Checkout] ${isTestMode ? "TEST" : "LIVE"} session created: ${session.id}`)
    console.log(`🔍 [Checkout] Session URL: ${session.url}`)

    // Verify session ID format
    if (isTestMode && !session.id.startsWith("cs_test_")) {
      console.error(`❌ [Checkout] Expected test session but got: ${session.id}`)
    } else if (!isTestMode && !session.id.startsWith("cs_live_")) {
      console.error(`❌ [Checkout] Expected live session but got: ${session.id}`)
    } else {
      console.log(`✅ [Checkout] Session ID format correct for ${isTestMode ? "TEST" : "LIVE"} mode`)
    }

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
        verificationMethod: "landing_page_immediate",
        testMode: isTestMode,
        sessionType: isTestMode ? "test" : "live",
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
        testMode: isTestMode,
        sessionType: isTestMode ? "test" : "live",
        verificationMethod: "landing_page_immediate",
      },
    })
  } catch (error: any) {
    console.error(`❌ [Checkout] Error creating ${isTestMode ? "TEST" : "LIVE"} session:`, error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
