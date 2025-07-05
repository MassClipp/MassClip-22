import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🛒 [Checkout] Starting checkout for product box: ${params.id}`)

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log("❌ [Checkout] No authenticated user")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = session.user.email
    console.log(`👤 [Checkout] User: ${userId}`)

    // Get product box data
    const productBoxRef = adminDb.collection("product_boxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Checkout] Product box not found: ${params.id}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`📦 [Checkout] Product box data:`, {
      title: productBoxData.title,
      price: productBoxData.price,
      creatorId: productBoxData.creatorId,
    })

    // Get creator's Stripe account
    const creatorRef = adminDb.collection("users").doc(productBoxData.creatorId)
    const creatorDoc = await creatorRef.get()

    if (!creatorDoc.exists) {
      console.log(`❌ [Checkout] Creator not found: ${productBoxData.creatorId}`)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      console.log(`❌ [Checkout] Creator has no Stripe account: ${productBoxData.creatorId}`)
      return NextResponse.json({ error: "Creator payment setup incomplete" }, { status: 400 })
    }

    console.log(`💳 [Checkout] Creator Stripe account: ${stripeAccountId}`)

    // Calculate amounts (Stripe uses cents)
    const priceInCents = Math.round(productBoxData.price * 100)
    const applicationFeeInCents = Math.round(priceInCents * 0.1) // 10% platform fee

    console.log(`💰 [Checkout] Price: $${productBoxData.price} (${priceInCents} cents)`)
    console.log(`💰 [Checkout] Platform fee: ${applicationFeeInCents} cents`)

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBoxData.title || "Premium Content Bundle",
              description: productBoxData.description || "Exclusive content bundle",
              images: productBoxData.thumbnailUrl ? [productBoxData.thumbnailUrl] : [],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${params.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product-box/${params.id}`,
      customer_email: userId,
      payment_intent_data: {
        application_fee_amount: applicationFeeInCents,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      metadata: {
        productBoxId: params.id,
        userId: userId,
        creatorId: productBoxData.creatorId,
        type: "product_box_purchase",
      },
    })

    console.log(`✅ [Checkout] Session created: ${checkoutSession.id}`)

    // Store pending purchase in Firestore
    const purchaseData = {
      id: checkoutSession.id,
      userId: userId,
      productBoxId: params.id,
      creatorId: productBoxData.creatorId,
      title: productBoxData.title,
      description: productBoxData.description,
      price: productBoxData.price,
      currency: "usd",
      status: "pending",
      stripeSessionId: checkoutSession.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: "product_box",
      metadata: {
        title: productBoxData.title,
        description: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl,
        contentCount: productBoxData.contentCount || 0,
        contentType: "video",
      },
    }

    await adminDb.collection("purchases").doc(checkoutSession.id).set(purchaseData)
    console.log(`💾 [Checkout] Pending purchase stored: ${checkoutSession.id}`)

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error("❌ [Checkout] Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
