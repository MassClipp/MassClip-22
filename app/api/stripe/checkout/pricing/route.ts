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

const FACELESS_PRO_PRICE_ID = "price_1SQ8yADheyb0pkWFK5LCP3Nd"
const FACELESSPRENUER_TRIAL_PRICE_ID = "price_1SPShFDheyb0pkWF6K9XzlpE" // $39/month with 3-day trial

async function hasEverPurchasedFacelessprenuer(userId: string): Promise<boolean> {
  try {
    console.log("[v0] Checking memberships collection for trial history via priceId")
    const membershipDoc = await adminDb.collection("memberships").doc(userId).get()
    
    if (!membershipDoc.exists) {
      console.log("[v0] No membership found - user has never purchased")
      return false
    }
    
    const membershipData = membershipDoc.data()
    const priceId = membershipData?.priceId

    const hasUsedTrial = priceId === FACELESSPRENUER_TRIAL_PRICE_ID

    console.log("[v0] Trial check from memberships priceId:", {
      userId: userId.substring(0, 8) + "...",
      priceId: priceId,
      trialPriceId: FACELESSPRENUER_TRIAL_PRICE_ID,
      hasUsedTrial: hasUsedTrial,
      shouldShowTrial: !hasUsedTrial,
    })

    return hasUsedTrial
  } catch (error) {
    console.error("[v0] Error checking memberships priceId:", error)
    // On error, default to false (allow trial) to not block purchases
    return false
  }
}

export async function POST(request: NextRequest) {
  console.log("🚀 [Membership Checkout] Starting session creation...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Membership Checkout] CRITICAL: Firebase Admin SDK is not initialized.")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { idToken, plan } = body
    console.log("📝 [Membership Checkout] Request:", { plan })

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
    let planName: string
    let shouldApplyTrial = false

    if (plan === "faceless_pro") {
      priceId = FACELESS_PRO_PRICE_ID
      planName = "faceless_pro"
      console.log(`💲 [Membership Checkout] Faceless Pro - $29/month (no trial)`)
    } else if (plan === "facelessprenuer") {
      if (!FACELESSPRENUER_TRIAL_PRICE_ID) {
        console.error("❌ [Membership Checkout] Missing Facelessprenuer price ID")
        return NextResponse.json(
          { error: "Facelessprenuer plan is not configured. Please contact support." },
          { status: 500 },
        )
      }

      const hasEverPurchased = await hasEverPurchasedFacelessprenuer(uid)

      console.log("[v0] Membership Checkout - Facelessprenuer trial eligibility:", {
        userId: uid.substring(0, 8) + "...",
        hasEverPurchasedFacelessprenuer: hasEverPurchased,
        willApplyTrial: !hasEverPurchased,
      })

      priceId = FACELESSPRENUER_TRIAL_PRICE_ID
      planName = "facelessprenuer"
      shouldApplyTrial = !hasEverPurchased

      console.log(
        `💲 [Membership Checkout] Facelessprenuer - ${!hasEverPurchased ? "3-day FREE trial then $39/month (first-time buyer)" : "$39/month (returning buyer, no trial)"}`,
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
      priceId: priceId,
      contentType: "membership",
      source: "dashboard_membership_upgrade",
    }

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
        ...(shouldApplyTrial && { trial_period_days: 3 }),
      },
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log("✅ [Membership Checkout] Session created:", session.id)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("❌ [Membership Checkout] Error:", error)
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  console.log("[v0] Trial Eligibility Check - GET request received")

  if (!isFirebaseAdminInitialized()) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const idToken = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(idToken)
    const { uid } = decodedToken

    const hasEverPurchased = await hasEverPurchasedFacelessprenuer(uid)

    console.log("[v0] Trial Eligibility Result:", {
      userId: uid.substring(0, 8) + "...",
      hasUsedFreeTrial: hasEverPurchased,
      shouldShowTrial: !hasEverPurchased,
    })

    return NextResponse.json({
      shouldShowTrial: !hasEverPurchased,
      hasUsedFreeTrial: hasEverPurchased,
      priceId: FACELESSPRENUER_TRIAL_PRICE_ID,
    })
  } catch (error: any) {
    console.error("[v0] Error checking trial eligibility:", error)
    return NextResponse.json({ error: "Failed to check trial eligibility" }, { status: 500 })
  }
}
