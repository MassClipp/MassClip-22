import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin, auth, db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout API] Request body:", { ...body, idToken: body.idToken ? "[REDACTED]" : "MISSING" })

    const { idToken, priceId, bundleId, successUrl, cancelUrl } = body

    if (!priceId) {
      console.error("❌ [Checkout API] Missing priceId")
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    if (!bundleId) {
      console.error("❌ [Checkout API] Missing bundleId")
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    let userId = null

    // If idToken is provided, verify it
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Checkout API] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Checkout API] Token verification failed:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    } else {
      console.log("⚠️ [Checkout API] No idToken provided, proceeding without user authentication")
    }

    // Get bundle details from bundles collection
    console.log("📦 [Checkout API] Fetching bundle:", bundleId)
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error("❌ [Checkout API] Bundle not found:", bundleId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundle = bundleDoc.data()!
    console.log("✅ [Checkout API] Bundle found:", {
      title: bundle.title,
      price: bundle.price,
      stripePriceId: bundle.stripePriceId,
      creatorId: bundle.creatorId,
    })

    // Get the current domain from multiple sources
    const host = request.headers.get("host")
    const forwardedHost = request.headers.get("x-forwarded-host")
    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")
    const protocol = request.headers.get("x-forwarded-proto") || "https"

    console.log("🌐 [Checkout API] Domain detection headers:", {
      host,
      forwardedHost,
      origin,
      referer,
      protocol,
    })

    // Determine the correct domain to use
    let currentDomain: string

    if (origin) {
      currentDomain = origin
      console.log("✅ [Checkout API] Using origin header:", currentDomain)
    } else if (referer) {
      try {
        const refererUrl = new URL(referer)
        currentDomain = `${refererUrl.protocol}//${refererUrl.host}`
        console.log("✅ [Checkout API] Using referer header:", currentDomain)
      } catch {
        currentDomain = `${protocol}://${host}`
        console.log("⚠️ [Checkout API] Referer parsing failed, using host:", currentDomain)
      }
    } else {
      currentDomain = `${protocol}://${forwardedHost || host}`
      console.log("⚠️ [Checkout API] Using fallback host:", currentDomain)
    }

    // For v0 preview environments, ensure we use the correct domain format
    if (host && host.includes("vercel.app") && !currentDomain.includes("vercel.app")) {
      currentDomain = `${protocol}://${host}`
      console.log("🔧 [Checkout API] Corrected for Vercel preview:", currentDomain)
    }

    console.log("💳 [Checkout API] Creating checkout session for:", { priceId, bundleId })

    const sessionMetadata: any = {
      bundleId: bundleId,
      creatorId: bundle.creatorId || "",
      originalDomain: currentDomain,
      timestamp: new Date().toISOString(),
    }

    if (userId) {
      sessionMetadata.userId = userId
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${currentDomain}/creator/${bundle.creatorId}`,
      metadata: sessionMetadata,
      allow_promotion_codes: true,
    })

    console.log("✅ [Checkout API] Session created successfully:")
    console.log("   Session ID:", session.id)
    console.log("   Checkout URL:", session.url)
    console.log("   Success URL:", session.success_url)
    console.log("   Cancel URL:", session.cancel_url)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      domain: currentDomain,
      successUrl: session.success_url,
    })
  } catch (error: any) {
    console.error("❌ [Checkout API] Session creation failed:", error)
    console.error("❌ [Checkout API] Error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
