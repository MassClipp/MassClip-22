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

export async function POST(request: NextRequest) {
  try {
    const { userId, priceId, successUrl, cancelUrl } = await request.json()

    if (!userId || !priceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`🔥 [LIVE CHECKOUT] Creating premium checkout session for user: ${userId}`)
    console.log(`🔥 [LIVE CHECKOUT] Stripe mode: ${stripeConfig.environment} (${stripeConfig.keyType})`)

    // Create checkout session in LIVE mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        type: "premium_subscription",
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
      await db.collection("checkoutSessions").doc(session.id).set({
        sessionId: session.id,
        userId: userId,
        type: "premium_subscription",
        priceId: priceId,
        status: session.payment_status,
        mode: session.mode,
        environment: stripeConfig.environment,
        createdAt: new Date(),
        url: session.url,
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
    console.error("Premium checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session", details: error.message }, { status: 500 })
  }
}
