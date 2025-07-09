import { type NextRequest, NextResponse } from "next/server"
import { stripe, stripeConfig } from "@/lib/stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, successUrl, cancelUrl } = await request.json()
    const productBoxId = params.id

    if (!userId || !productBoxId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔥 [LIVE CHECKOUT] Creating product box checkout for: ${productBoxId}`)
    console.log(`🔥 [LIVE CHECKOUT] User: ${userId}`)
    console.log(`🔥 [LIVE CHECKOUT] Stripe mode: ${stripeConfig.environment} (${stripeConfig.keyType})`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    const price = productBoxData?.price || 999 // Default price in cents

    console.log(`🔥 [LIVE CHECKOUT] Product box price: $${price / 100}`)

    // Create checkout session in LIVE mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData?.title || "Premium Content",
              description: productBoxData?.description || "Access to premium content",
              metadata: {
                productBoxId: productBoxId,
                type: "product_box",
              },
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${productBoxId}`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        productBoxId: productBoxId,
        type: "product_box_purchase",
        environment: stripeConfig.environment,
        created_at: new Date().toISOString(),
      },
    })

    console.log(`🔥 [LIVE CHECKOUT] Created session: ${session.id}`)
    console.log(`🔥 [LIVE CHECKOUT] Session URL: ${session.url}`)
    console.log(`🔥 [LIVE CHECKOUT] Session mode: ${session.mode}`)
    console.log(`🔥 [LIVE CHECKOUT] Payment status: ${session.payment_status}`)

    // Store session info for debugging
    try {
      await db
        .collection("checkoutSessions")
        .doc(session.id)
        .set({
          sessionId: session.id,
          userId: userId,
          productBoxId: productBoxId,
          type: "product_box_purchase",
          price: price,
          status: session.payment_status,
          mode: session.mode,
          environment: stripeConfig.environment,
          createdAt: new Date(),
          url: session.url,
          productBoxData: {
            title: productBoxData?.title,
            description: productBoxData?.description,
          },
        })
      console.log(`🔥 [LIVE CHECKOUT] Stored session info in Firestore`)
    } catch (firestoreError) {
      console.error("Failed to store session info:", firestoreError)
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
      environment: stripeConfig.environment,
    })
  } catch (error) {
    console.error("Product box checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session", details: error.message }, { status: 500 })
  }
}
