import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, isFirebaseAdminInitialized, adminDb } from "@/lib/firebase-admin"

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  throw new Error("Missing Stripe API key. Set STRIPE_SECRET_KEY environment variable.")
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-06-20",
})

const FACELESS_PRO_PRICE_ID = "price_1SQBMvDheyb0pkWFPGz7vke7" // Updated to new test price ID
const FACELESSPRENUER_FIRST_TIME_PRICE_ID = process.env.FACELESSPRENUER_FIRST
const FACELESSPRENUER_REGULAR_PRICE_ID = process.env.FACELESSPRENUER_REGULAR

export async function POST(request: NextRequest) {
  console.log("🚀 [Membership Checkout] Starting session creation...")
  console.log("[v0] Environment check:", {
    hasFacelessProFirst: !!process.env.FACELESS_PRO_FIRST,
    hasFacelessprenuerFirst: !!FACELESSPRENUER_FIRST_TIME_PRICE_ID,
    hasFacelessprenuerRegular: !!FACELESSPRENUER_REGULAR_PRICE_ID,
    usingTestPriceId: FACELESS_PRO_PRICE_ID,
  })

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Membership Checkout] CRITICAL: Firebase Admin SDK is not initialized.")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { idToken, plan } = body
    console.log("📝 [Membership Checkout] Request:", { plan })
    console.log("[v0] Request body:", { plan, hasIdToken: !!idToken })

    if (!idToken) {
      console.error("❌ [Membership Checkout] Missing idToken.")
      return NextResponse.json({ error: "User not authenticated." }, { status: 401 })
    }

    // --- Authenticate User ---
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Membership Checkout] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token." }, { status: 403 })
    }

    const { uid, email, name } = decodedToken
    console.log("✅ [Membership Checkout] User authenticated:", { uid, email, plan })

    let priceId: string
    let trialPeriodDays: number | undefined = undefined
    let planName: string

    if (plan === "faceless_pro") {
      priceId = FACELESS_PRO_PRICE_ID
      planName = "faceless_pro"
      console.log(`💲 [Membership Checkout] Faceless Pro - $29/month (no trial)`)
      console.log("[v0] Selected Faceless Pro price ID:", priceId)
    } else if (plan === "facelessprenuer") {
      if (!FACELESSPRENUER_FIRST_TIME_PRICE_ID || !FACELESSPRENUER_REGULAR_PRICE_ID) {
        console.error("❌ [Membership Checkout] Missing Facelessprenuer price IDs")
        return NextResponse.json(
          { error: "Facelessprenuer plan is not configured. Please contact support." },
          { status: 500 },
        )
      }

      let hasUsedTrial = false
      try {
        const freeUserDoc = await adminDb.collection("freeUsers").doc(uid).get()
        if (freeUserDoc.exists) {
          const freeUserData = freeUserDoc.data()
          hasUsedTrial = freeUserData?.hasUsedFreeTrial || false
        }
      } catch (error) {
        console.error("⚠️ [Membership Checkout] Error checking trial status:", error)
      }

      priceId = hasUsedTrial ? FACELESSPRENUER_REGULAR_PRICE_ID : FACELESSPRENUER_FIRST_TIME_PRICE_ID
      trialPeriodDays = hasUsedTrial ? undefined : 3
      planName = "facelessprenuer"
      console.log(
        `💲 [Membership Checkout] Facelessprenuer - ${hasUsedTrial ? "$39/month (no trial)" : "3-day trial then $39/month"}`,
      )
    } else {
      console.error("❌ [Membership Checkout] Invalid plan:", plan)
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 })
    }

    console.log(`💲 [Membership Checkout] Using Price ID: ${priceId}`)

    // --- Construct Metadata ---
    const metadata = {
      buyerUid: uid,
      buyerEmail: email || "",
      buyerName: name || email?.split("@")[0] || "",
      plan: planName,
      contentType: "membership",
      source: "dashboard_membership_upgrade",
      priceId: priceId,
    }

    console.log("[v0] Session metadata:", metadata)

    // --- Get Site URL for Redirects ---
    const host = request.headers.get("host")!
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const siteUrl = `${protocol}://${host}`

    console.log("🔄 [Membership Checkout] Creating Stripe session...")

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${siteUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/upgrade`,
      metadata: metadata,
      subscription_data: {
        metadata: metadata,
        ...(trialPeriodDays && { trial_period_days: trialPeriodDays }),
      },
    }

    console.log("[v0] About to create Stripe session with params:", {
      priceId,
      email,
      trialPeriodDays,
      metadata,
    })

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log("✅ [Membership Checkout] Session created:", session.id)
    console.log("[v0] Session URL:", session.url)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("❌ [Membership Checkout] Error:", error)
    console.error("[v0] Full error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
    })
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}
