import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const PLAN_CONFIGS = {
  starter: {
    plan: "starter" as const,
    features: {
      maxBundles: 5,
      maxVideosPerBundle: 15,
      maxFolders: 3,
      noWatermark: false,
      platformFeePercentage: 20,
      premiumContent: false,
      prioritySupport: false,
      unlimitedDownloads: false,
    },
  },
  creator_pro: {
    plan: "creator_pro" as const,
    features: {
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      noWatermark: true,
      platformFeePercentage: 10,
      premiumContent: true,
      prioritySupport: true,
      unlimitedDownloads: true,
    },
  },
}

const PRICE_ID_TO_PLAN: Record<string, keyof typeof PLAN_CONFIGS> = {
  price_1SKKFPDheyb0pkWFBT6lf7V7: "starter",
  price_1SK7SzDheyb0pkWFaKOzIOzf: "creator_pro",
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json()

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing uid" }, { status: 400 })
    }

    // Get current membership
    const membershipRef = adminDb.collection("memberships").doc(uid)
    const membershipDoc = await membershipRef.get()

    if (!membershipDoc.exists) {
      return NextResponse.json({ success: false, error: "Membership not found" }, { status: 404 })
    }

    const currentData = membershipDoc.data()!
    const priceId = currentData.priceId

    if (!priceId) {
      return NextResponse.json({ success: false, error: "No price ID in membership" }, { status: 400 })
    }

    // Get correct plan config
    const planKey = PRICE_ID_TO_PLAN[priceId]
    if (!planKey) {
      return NextResponse.json({ success: false, error: `Unknown price ID: ${priceId}` }, { status: 400 })
    }

    const planConfig = PLAN_CONFIGS[planKey]
    const isActive = currentData.status === "active" || currentData.status === "trialing"

    // Build complete membership document
    const updatedData = {
      ...currentData,
      plan: planConfig.plan,
      isActive,
      features: {
        ...planConfig.features,
        isActive, // Add isActive to features
      },
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Write complete document (no merge)
    await membershipRef.set(updatedData)

    return NextResponse.json({
      success: true,
      message: `Fixed membership for ${uid}`,
      plan: planConfig.plan,
      priceId,
      isActive,
    })
  } catch (error) {
    console.error("Error fixing membership:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
