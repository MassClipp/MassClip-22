import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Plan configurations matching the webhook logic
const FACELESSPRENUER_CONFIG = {
  plan: "facelessprenuer" as const,
  features: {
    unlimitedDownloads: true,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: true,
    platformFeePercentage: 10,
    maxVideosPerBundle: null,
    maxBundles: null,
    maxFolders: null,
    isActive: true,
  },
}

const FACELESS_PRO_CONFIG = {
  plan: "faceless_pro" as const,
  features: {
    unlimitedDownloads: false,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: false,
    platformFeePercentage: 20,
    maxVideosPerBundle: 15,
    maxBundles: 5,
    maxFolders: 3,
    isActive: true,
  },
}

export async function GET() {
  return NextResponse.json({
    message: "This is a POST-only endpoint for simulating purchases.",
    usage: "Go to /admin/test-membership-permissions to use the simulate purchase feature.",
    endpoint: "/api/debug/simulate-purchase",
    method: "POST",
    body: {
      uid: "user_id",
      plan: "faceless_pro | facelessprenuer",
    },
  })
}

export async function POST(request: Request) {
  try {
    const { plan, uid } = await request.json()

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    if (!plan || !["faceless_pro", "facelessprenuer"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan. Must be 'faceless_pro' or 'facelessprenuer'" }, { status: 400 })
    }

    console.log(`[DEBUG] Simulating purchase for user ${uid} with plan ${plan}`)

    // Get the plan config
    const config = plan === "facelessprenuer" ? FACELESSPRENUER_CONFIG : FACELESS_PRO_CONFIG

    // Get the appropriate price ID from environment variables
    const priceId = plan === "facelessprenuer" ? process.env.FACELESSPRENUER_FIRST : "price_1SQ8yADheyb0pkWFK5LCP3Nd"

    // Create a simulated subscription
    const currentPeriodEnd = new Date()
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // 1 month from now

    const membershipData = {
      uid,
      email: null,
      plan: config.plan,
      status: "active",
      isActive: true,
      stripeCustomerId: `debug_customer_${Date.now()}`,
      stripeSubscriptionId: `debug_sub_${Date.now()}`,
      currentPeriodEnd,
      priceId,
      downloadsUsed: 0,
      bundlesCreated: 0,
      features: {
        ...config.features,
        isActive: true,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Update the membership in Firebase
    await adminDb.collection("memberships").doc(uid).set(membershipData, { merge: true })

    console.log(`[DEBUG] ✅ Successfully simulated purchase for ${uid} with plan ${plan}`)

    return NextResponse.json({
      success: true,
      message: `Successfully simulated ${plan} purchase`,
      membership: {
        plan: config.plan,
        features: config.features,
      },
    })
  } catch (error: any) {
    console.error("[DEBUG] Error simulating purchase:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
