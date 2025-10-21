import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, isFirebaseAdminInitialized, adminDb } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const STARTER_PRICE_ID = "price_1SKKFPDheyb0pkWFBT6lf7V7" // $3/month flat (no trial)
const CREATOR_VIP_FIRST_TIME_PRICE_ID = "price_1SK7SzDheyb0pkWFaKOzIOzf" // $15/month with 3-day trial
const CREATOR_VIP_REGULAR_PRICE_ID = "price_1SK7SzDheyb0pkWFaKOzIOzf" // $15/month no trial

export async function POST(request: NextRequest) {
  console.log("🚀 [Membership Checkout] Starting session creation...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Membership Checkout] CRITICAL: Firebase Admin SDK is not initialized.")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { idToken, plan } = body
    console.log("📝 [Membership Checkout] Request body received:", { hasIdToken: !!idToken, plan })

    if (!idToken) {
      console.error("❌ [Membership Checkout] Authentication error: Missing idToken.")
      return NextResponse.json({ error: "User not authenticated." }, { status: 401 })
    }

    // --- Authenticate User ---
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Membership Checkout] Firebase token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token." }, { status: 403 })
    }

    const { uid, email, name } = decodedToken
    console.log("✅ [Membership Checkout] User authenticated:", { uid, email, plan })

    let hasUsedTrial = false
    try {
      const freeUserDoc = await adminDb.collection("freeUsers").doc(uid).get()
      if (freeUserDoc.exists) {
        const freeUserData = freeUserDoc.data()
        hasUsedTrial = freeUserData?.hasUsedFirstWeekDiscount || false
        console.log(`📊 [Membership Checkout] User trial status: ${hasUsedTrial}`)
      }
    } catch (error) {
      console.error("⚠️ [Membership Checkout] Error checking trial status:", error)
    }

    let priceId: string
    let trialPeriodDays: number | undefined = undefined

    if (plan === "starter") {
      priceId = STARTER_PRICE_ID
      console.log(`💲 [Membership Checkout] Starter Plan - $3/month (no trial)`)
    } else if (plan === "creator_vip" || plan === "creator_pro") {
      priceId = hasUsedTrial ? CREATOR_VIP_REGULAR_PRICE_ID : CREATOR_VIP_FIRST_TIME_PRICE_ID
      trialPeriodDays = hasUsedTrial ? undefined : 3
      console.log(
        `💲 [Membership Checkout] Creator VIP - ${hasUsedTrial ? "$15/month (no trial)" : "3-day free trial then $15/month"}`,
      )
    }
    // Default to Creator VIP
    else {
      priceId = hasUsedTrial ? CREATOR_VIP_REGULAR_PRICE_ID : CREATOR_VIP_FIRST_TIME_PRICE_ID
      trialPeriodDays = hasUsedTrial ? undefined : 3
      console.log(`💲 [Membership Checkout] No plan specified, defaulting to Creator VIP`)
    }

    console.log(`💲 [Membership Checkout] Using Stripe Price ID: ${priceId}`)
    console.log(`💲 [Membership Checkout] Trial period days: ${trialPeriodDays || "none"}`)

    // --- Construct Metadata ---
    const metadata = {
      buyerUid: uid,
      buyerEmail: email || "",
      buyerName: name || email?.split("@")[0] || "",
      plan: plan === "starter" ? "starter" : "creator_pro",
      contentType: "membership",
      source: "dashboard_membership_upgrade",
      isFirstTimeDiscount: (trialPeriodDays !== undefined && !hasUsedTrial).toString(),
    }
    console.log("📋 [Membership Checkout] Constructed metadata for Stripe:", metadata)

    // --- Get Site URL for Redirects ---
    const host = request.headers.get("host")!
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const siteUrl = `${protocol}://${host}`

    console.log("🔄 [Membership Checkout] Creating Stripe session on PLATFORM account...")

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
        ...(trialPeriodDays && { trial_period_days: trialPeriodDays }), // Add trial period if applicable
      },
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log("✅ [Membership Checkout] Stripe session created successfully!")
    console.log(`   - Session ID: ${session.id}`)
    console.log(`   - Checkout URL: ${session.url}`)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("❌ [Membership Checkout] An unexpected error occurred:", error)
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}
