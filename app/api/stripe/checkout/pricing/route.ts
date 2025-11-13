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
const FACELESSPRENUER_FIRST_TIME_PRICE_ID = process.env.FACELESSPRENUER_FIRST
const FACELESSPRENUER_REGULAR_PRICE_ID = process.env.FACELESSPRENUER_REGULAR

async function hasEverSubscribedToFacelessprenuer(userId: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get()
    let stripeCustomerId = userDoc.data()?.stripeCustomerId

    // Fallback: check memberships collection if not in users
    if (!stripeCustomerId) {
      console.log("[v0] No stripeCustomerId in users collection, checking memberships...")
      const membershipDoc = await adminDb.collection("memberships").doc(userId).get()
      stripeCustomerId = membershipDoc.data()?.stripeCustomerId

      if (stripeCustomerId) {
        console.log("[v0] Found stripeCustomerId in memberships:", stripeCustomerId)
        // Backfill it to users collection for future lookups
        await adminDb.collection("users").doc(userId).set(
          {
            stripeCustomerId,
            updatedAt: new Date(),
          },
          { merge: true },
        )
        console.log("[v0] Backfilled stripeCustomerId to users collection")
      }
    }

    if (!stripeCustomerId) {
      console.log("[v0] No customer ID in Firestore, trying email search...")
      const userDoc = await adminDb.collection("users").doc(userId).get()
      const userEmail = userDoc.data()?.email

      if (userEmail) {
        try {
          const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
          })

          if (customers.data.length > 0 && customers.data[0]) {
            stripeCustomerId = customers.data[0].id
            console.log("[v0] Found customer by email:", stripeCustomerId)

            // Backfill to both collections
            await adminDb.collection("users").doc(userId).set(
              {
                stripeCustomerId,
                updatedAt: new Date(),
              },
              { merge: true },
            )
            console.log("[v0] Backfilled customer ID to users collection")
          }
        } catch (emailError) {
          console.error("[v0] Error searching by email:", emailError)
        }
      }
    }

    if (!stripeCustomerId) {
      console.log("[v0] No Stripe customer ID found for user, first-time buyer")
      return false
    }

    // Query Stripe for all subscriptions ever created for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 100, // Get all historical subscriptions
    })

    console.log("[v0] Found", subscriptions.data.length, "total subscriptions for customer")

    // Check if any subscription (active, canceled, or expired) had Facelessprenuer price ID
    const hasEverHadFacelessprenuer = subscriptions.data.some((sub) =>
      sub.items.data.some(
        (item) =>
          item.price.id === FACELESSPRENUER_FIRST_TIME_PRICE_ID ||
          item.price.id === FACELESSPRENUER_REGULAR_PRICE_ID ||
          item.price.id === "price_1SPRLKDheyb0pkWFnRvP15AO" || // Legacy first-time price
          item.price.id === "price_1SPShFDheyb0pkWF6K9Xz1pE", // Legacy regular price
      ),
    )

    console.log("[v0] User has ever subscribed to Facelessprenuer:", hasEverHadFacelessprenuer)
    return hasEverHadFacelessprenuer
  } catch (error) {
    console.error("[v0] Error checking Stripe subscription history:", error)
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
    let trialPeriodDays: number | undefined = undefined
    let planName: string

    if (plan === "faceless_pro") {
      priceId = FACELESS_PRO_PRICE_ID
      trialPeriodDays = undefined // No trial
      planName = "faceless_pro"
      console.log(`💲 [Membership Checkout] Faceless Pro - $29/month (no trial)`)
    } else if (plan === "facelessprenuer") {
      if (!FACELESSPRENUER_FIRST_TIME_PRICE_ID || !FACELESSPRENUER_REGULAR_PRICE_ID) {
        console.error("❌ [Membership Checkout] Missing Facelessprenuer price IDs")
        return NextResponse.json(
          { error: "Facelessprenuer plan is not configured. Please contact support." },
          { status: 500 },
        )
      }

      const hasEverHadFacelessprenuer = await hasEverSubscribedToFacelessprenuer(uid)

      console.log("[v0] Membership Checkout - Facelessprenuer trial eligibility:", {
        userId: uid.substring(0, 8) + "...",
        hasEverHadFacelessprenuer,
        willUseTrialPrice: !hasEverHadFacelessprenuer,
        priceIdToUse: hasEverHadFacelessprenuer ? "REGULAR (no trial)" : "FIRST (with trial)",
      })

      // First-time buyers get the trial price, returning buyers get regular price
      priceId = hasEverHadFacelessprenuer ? FACELESSPRENUER_REGULAR_PRICE_ID : FACELESSPRENUER_FIRST_TIME_PRICE_ID
      trialPeriodDays = undefined // Trial is built into the price ID itself for Facelessprenuer
      planName = "facelessprenuer"

      console.log(
        `💲 [Membership Checkout] Facelessprenuer - ${hasEverHadFacelessprenuer ? "$39/month (returning buyer, no trial)" : "3-day trial then $39/month (first-time buyer)"}`,
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
      priceId: priceId, // CRITICAL: Include priceId in metadata for webhooks
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
        ...(trialPeriodDays && { trial_period_days: trialPeriodDays }),
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
