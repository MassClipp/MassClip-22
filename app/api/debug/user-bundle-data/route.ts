import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { getUserTierInfo } from "@/lib/user-tier-service"
import { getUserBundleSlots } from "@/lib/bundle-slots-service"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("[v0] Debug: Checking user bundle data for:", userId)

    // Get raw Firestore documents
    const freeUserDoc = await adminDb.collection("freeUsers").doc(userId).get()
    const bundleSlotsDoc = await adminDb.collection("userBundleSlots").doc(userId).get()
    const bundlesSnapshot = await adminDb.collection("bundles").where("creatorId", "==", userId).get()

    // Get processed data from services
    const tierInfo = await getUserTierInfo(userId)
    const bundleSlots = await getUserBundleSlots(userId)

    const debugData = {
      userId,
      rawFirestoreData: {
        freeUser: freeUserDoc.exists ? freeUserDoc.data() : null,
        bundleSlots: bundleSlotsDoc.exists ? bundleSlotsDoc.data() : null,
        bundleCount: bundlesSnapshot.size,
        bundles: bundlesSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          createdAt: doc.data().createdAt,
          contentItems: doc.data().contentItems?.length || 0,
        })),
      },
      processedData: {
        tierInfo,
        bundleSlots,
      },
      calculations: {
        baseFreeLimit: 2,
        actualBundlesLimit: tierInfo.bundlesLimit,
        difference: tierInfo.bundlesLimit - 2,
        shouldBe:
          freeUserDoc.exists && freeUserDoc.data()?.bundlesLimit
            ? `Base (2) + Extra purchased (${freeUserDoc.data()?.bundlesLimit - 2}) = ${freeUserDoc.data()?.bundlesLimit}`
            : "Base free tier (2)",
      },
    }

    console.log("[v0] Debug data:", JSON.stringify(debugData, null, 2))

    return NextResponse.json(debugData)
  } catch (error) {
    console.error("[v0] Debug error:", error)
    return NextResponse.json(
      {
        error: "Failed to get debug data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
