import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import Stripe from "stripe"

initializeFirebaseAdmin()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
})

const FACELESSPRENUER_FIRST = process.env.FACELESSPRENUER_FIRST || ""
const FACELESSPRENUER_REGULAR = process.env.FACELESSPRENUER_REGULAR || ""
const LEGACY_FACELESSPRENUER_FIRST = "price_1SPRLKDheyb0pkWFnRvP15AO"
const LEGACY_FACELESSPRENUER_REGULAR = "price_1SPShFDheyb0pkWF6K9Xz1pE"

export async function POST(request: NextRequest) {
  const logs: string[] = []

  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    logs.push(`[1] User ID: ${userId}`)
    logs.push(`[2] Email: ${userEmail}`)

    // Check Firestore for user data
    const userDoc = await db.collection("users").doc(userId).get()
    let stripeCustomerId = userDoc.data()?.stripeCustomerId

    logs.push(`[3] Stripe Customer ID from users: ${stripeCustomerId || "NOT_FOUND"}`)

    if (!stripeCustomerId && userEmail) {
      logs.push(`[4] Searching Stripe by email: ${userEmail}`)
      try {
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        })

        if (customers.data.length > 0 && customers.data[0]) {
          stripeCustomerId = customers.data[0].id
          logs.push(`[5] ✅ Found Stripe customer by email: ${stripeCustomerId}`)

          // Backfill to Firebase
          await db.collection("users").doc(userId).set(
            {
              stripeCustomerId,
              updatedAt: new Date(),
            },
            { merge: true },
          )
          logs.push(`[6] ✅ Backfilled customer ID to Firebase`)
        } else {
          logs.push("[5] ❌ No Stripe customer found by email")
        }
      } catch (emailSearchError) {
        logs.push(`[5] ⚠️ Error searching by email: ${emailSearchError}`)
      }
    }

    // Check freeUsers collection for legacy flags
    const freeUserDoc = await db.collection("freeUsers").doc(userId).get()
    const freeUserData = freeUserDoc.data()
    const firestoreFlags = {
      hasUsedFreeTrial: freeUserData?.hasUsedFreeTrial || false,
      hasEverPurchasedFacelessprenuer: freeUserData?.hasEverPurchasedFacelessprenuer || false,
    }

    logs.push(`[7] Firestore hasUsedFreeTrial: ${firestoreFlags.hasUsedFreeTrial}`)
    logs.push(`[8] Firestore hasEverPurchasedFacelessprenuer: ${firestoreFlags.hasEverPurchasedFacelessprenuer}`)

    if (!stripeCustomerId) {
      logs.push("[9] No Stripe customer - eligible for trial (first time user)")
      return NextResponse.json({
        userId,
        email: userEmail,
        stripeCustomerId: null,
        subscriptionHistory: [],
        hasEverHadFacelessprenuer: false,
        currentSubscription: null,
        shouldShowTrial: true,
        priceIdToUse: FACELESSPRENUER_FIRST,
        firestoreFlags,
        logs,
      })
    }

    // Query Stripe for all subscriptions
    logs.push("[10] Querying Stripe for subscription history...")
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 100,
    })

    logs.push(`[11] Found ${subscriptions.data.length} total subscriptions`)

    // Check if any subscription was for Facelessprenuer
    const facelessprenuerSubs = subscriptions.data.filter((sub) => {
      const priceId = sub.items.data[0]?.price.id
      const isFacelessprenuer =
        priceId === FACELESSPRENUER_FIRST ||
        priceId === FACELESSPRENUER_REGULAR ||
        priceId === LEGACY_FACELESSPRENUER_FIRST ||
        priceId === LEGACY_FACELESSPRENUER_REGULAR

      if (isFacelessprenuer) {
        logs.push(`[12] Found Facelessprenuer subscription: ${sub.id} (status: ${sub.status}, price: ${priceId})`)
      }
      return isFacelessprenuer
    })

    const hasEverHadFacelessprenuer = facelessprenuerSubs.length > 0
    const currentSub = facelessprenuerSubs.find((sub) => sub.status === "active" || sub.status === "trialing")

    logs.push(`[13] Has ever had Facelessprenuer: ${hasEverHadFacelessprenuer}`)
    logs.push(`[14] Current active Facelessprenuer: ${currentSub ? currentSub.status : "None"}`)

    // Determine trial eligibility
    const shouldShowTrial = !hasEverHadFacelessprenuer
    const priceIdToUse = shouldShowTrial ? FACELESSPRENUER_FIRST : FACELESSPRENUER_REGULAR

    logs.push(
      `[15] RESULT: ${shouldShowTrial ? "ELIGIBLE FOR TRIAL" : "NOT ELIGIBLE - ALREADY USED"} (price: ${shouldShowTrial ? "FIRST" : "REGULAR"})`,
    )

    return NextResponse.json({
      userId,
      email: userEmail,
      stripeCustomerId,
      subscriptionHistory: subscriptions.data.map((sub) => ({
        id: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price.id,
        plan: sub.items.data[0]?.price.nickname || sub.items.data[0]?.price.id,
        created: sub.created,
        currentPeriodEnd: sub.current_period_end,
      })),
      hasEverHadFacelessprenuer,
      currentSubscription: currentSub
        ? {
            id: currentSub.id,
            status: currentSub.status,
            priceId: currentSub.items.data[0]?.price.id,
          }
        : null,
      shouldShowTrial,
      priceIdToUse,
      firestoreFlags,
      logs,
    })
  } catch (error) {
    logs.push(`[ERROR] ${error instanceof Error ? error.message : "Unknown error"}`)
    return NextResponse.json(
      {
        error: "Failed to run diagnostics",
        details: error instanceof Error ? error.message : "Unknown error",
        logs,
      },
      { status: 500 },
    )
  }
}
