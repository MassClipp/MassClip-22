import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, isFirebaseAdminInitialized, adminDb } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const STARTER_FIRST_WEEK_PRICE_ID = "price_1SK6rgDheyb0pkWFkH8b2KCJ" // $3 for first week, then $10/month
const STARTER_REGULAR_PRICE_ID = "price_1SK7PDDheyb0pkWFJmVMvxMR" // $10/month upfront
const CREATOR_PRO_FIRST_WEEK_PRICE_ID = "price_1SK7ReDheyb0pkWFRGQkQ3rI" // $3 for first week, then $15/month
const CREATOR_PRO_REGULAR_PRICE_ID = "price_1SK7SzDheyb0pkWFaKOzIOzf" // $15/month upfront

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

    let hasUsedFirstWeekDiscount = false
    try {
      const freeUserDoc = await adminDb.collection("freeUsers").doc(uid).get()
      if (freeUserDoc.exists) {
        const freeUserData = freeUserDoc.data()
        hasUsedFirstWeekDiscount = freeUserData?.hasUsedFirstWeekDiscount || false
        console.log(`📊 [Membership Checkout] User first week discount status: ${hasUsedFirstWeekDiscount}`)
      }
    } catch (error) {
      console.error("⚠️ [Membership Checkout] Error checking first week discount status:", error)
    }

    let priceId: string
    let isPromotionalPricing = false

    if (plan === "starter") {
      if (hasUsedFirstWeekDiscount) {
        priceId = STARTER_REGULAR_PRICE_ID
        console.log(`💲 [Membership Checkout] Starter Plan - Using regular pricing ($10/month)`)
      } else {
        priceId = STARTER_FIRST_WEEK_PRICE_ID
        isPromotionalPricing = true
        console.log(`💲 [Membership Checkout] Starter Plan - Using promotional pricing ($3 first week)`)
      }
    } else if (plan === "creator_pro") {
      if (hasUsedFirstWeekDiscount) {
        priceId = CREATOR_PRO_REGULAR_PRICE_ID
        console.log(`💲 [Membership Checkout] Creator Pro - Using regular pricing ($15/month)`)
      } else {
        priceId = CREATOR_PRO_FIRST_WEEK_PRICE_ID
        isPromotionalPricing = true
        console.log(`💲 [Membership Checkout] Creator Pro - Using promotional pricing ($3 first week)`)
      }
    } else {
      // Default to Creator Pro if no plan specified
      if (hasUsedFirstWeekDiscount) {
        priceId = CREATOR_PRO_REGULAR_PRICE_ID
      } else {
        priceId = CREATOR_PRO_FIRST_WEEK_PRICE_ID
        isPromotionalPricing = true
      }
      console.log(`💲 [Membership Checkout] No plan specified, defaulting to Creator Pro`)
    }

    console.log(`💲 [Membership Checkout] Using Stripe Price ID: ${priceId}`)
    console.log(`💲 [Membership Checkout] Is promotional pricing: ${isPromotionalPricing}`)

    // --- Construct Metadata ---
    const metadata = {
      buyerUid: uid,
      buyerEmail: email || "",
      buyerName: name || email?.split("@")[0] || "",
      plan: plan || "creator_pro",
      contentType: "membership",
      source: "dashboard_membership_upgrade",
      isFirstTimeDiscount: isPromotionalPricing.toString(),
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
