import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const FACELESS_PRO_CONFIG = {
  plan: "faceless_pro" as const,
  features: {
    unlimitedDownloads: false,
    premiumContent: false,
    noWatermark: false,
    platformFeePercentage: 20,
    maxVideosPerBundle: 15,
    maxBundles: 5,
    maxFolders: 3,
    isActive: true,
  },
}

const FACELESSPRENUER_CONFIG = {
  plan: "facelessprenuer" as const,
  features: {
    unlimitedDownloads: true,
    premiumContent: true,
    noWatermark: true,
    platformFeePercentage: 10,
    maxVideosPerBundle: null,
    maxBundles: null,
    maxFolders: null,
    isActive: true,
  },
}

export async function POST(request: Request) {
  try {
    const { uid, plan } = await request.json()

    if (!uid || !plan) {
      return NextResponse.json({ error: "Missing uid or plan" }, { status: 400 })
    }

    if (plan === "free") {
      // Remove membership and set as free user
      await adminDb.collection("memberships").doc(uid).delete()
      await adminDb.collection("freeUsers").doc(uid).set(
        {
          uid,
          plan: "free",
          downloadsUsed: 0,
          bundlesCreated: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return NextResponse.json({ success: true, plan: "free" })
    }

    const config = plan === "faceless_pro" ? FACELESS_PRO_CONFIG : FACELESSPRENUER_CONFIG

    // Set membership
    await adminDb.collection("memberships").doc(uid).set(
      {
        uid,
        plan: config.plan,
        status: "active",
        isActive: true,
        stripeCustomerId: "test_customer",
        stripeSubscriptionId: "test_subscription",
        currentPeriodEnd: null,
        priceId: "test_price",
        downloadsUsed: 0,
        bundlesCreated: 0,
        features: config.features,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    // Remove from free users
    await adminDb.collection("freeUsers").doc(uid).delete()

    return NextResponse.json({ success: true, plan: config.plan })
  } catch (error: any) {
    console.error("Error setting membership:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
