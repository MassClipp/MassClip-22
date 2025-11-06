import { type NextRequest, NextResponse } from "next/server"
import { getFreeUserLimits } from "@/lib/free-users-service"
import { verifyIdToken } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let uid = searchParams.get("uid")

    // If no uid in query params, try to get from auth header
    if (!uid) {
      const authHeader = request.headers.get("Authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await verifyIdToken(idToken)
        uid = decodedToken.uid
      }
    }

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter or authorization" }, { status: 400 })
    }

    console.log("🔄 Getting free user limits for:", uid.substring(0, 8) + "...")

    const limits = await getFreeUserLimits(uid)

    console.log("✅ Retrieved free user limits:", {
      tier: limits.tier,
      downloadsUsed: limits.downloadsUsed,
      downloadsLimit: limits.downloadsLimit,
      bundlesCreated: limits.bundlesCreated,
      bundlesLimit: limits.bundlesLimit,
      reachedDownloadLimit: limits.reachedDownloadLimit,
      reachedBundleLimit: limits.reachedBundleLimit,
      hasUsedFirstWeekDiscount: limits.hasUsedFirstWeekDiscount,
    })

    return NextResponse.json({
      success: true,
      limits,
      hasUsedFirstWeekDiscount: limits.hasUsedFirstWeekDiscount,
    })
  } catch (error) {
    console.error("❌ Error getting free user limits:", error)
    return NextResponse.json(
      {
        error: "Failed to get free user limits",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
