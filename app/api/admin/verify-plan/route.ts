import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const plan = searchParams.get("plan")

    if (!plan || !["faceless_pro", "facelessprenuer"].includes(plan)) {
      return NextResponse.json({ success: false, error: "Invalid plan parameter" }, { status: 400 })
    }

    // Create a test user ID for verification
    const testUserId = `test_${plan}_${Date.now()}`

    // Get plan configuration from webhook processor
    const PLAN_CONFIGS = {
      faceless_pro: {
        plan: "faceless_pro" as const,
        features: {
          maxBundles: 5,
          maxVideosPerBundle: 15,
          maxFolders: 3,
          noWatermark: false,
          platformFeePercentage: 20,
          premiumContent: false,
          prioritySupport: false,
          unlimitedDownloads: false,
          isActive: true,
        },
      },
      facelessprenuer: {
        plan: "facelessprenuer" as const,
        features: {
          maxBundles: null,
          maxVideosPerBundle: null,
          maxFolders: null,
          noWatermark: true,
          platformFeePercentage: 10,
          premiumContent: true,
          prioritySupport: true,
          unlimitedDownloads: true,
          isActive: true,
        },
      },
    }

    const planConfig = PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS]

    // Create a test membership document
    const testMembership = {
      uid: testUserId,
      plan: planConfig.plan,
      status: "active",
      isActive: true,
      features: planConfig.features,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Write to Firestore for verification
    await adminDb.collection("memberships").doc(testUserId).set(testMembership)

    // Read it back to verify
    const doc = await adminDb.collection("memberships").doc(testUserId).get()
    const membership = doc.data()

    // Clean up test document
    await adminDb.collection("memberships").doc(testUserId).delete()

    return NextResponse.json({
      success: true,
      membership,
      expectedConfig: planConfig,
    })
  } catch (error) {
    console.error("Error verifying plan:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
