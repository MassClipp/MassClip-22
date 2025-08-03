import { type NextRequest, NextResponse } from "next/server"
import { purchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  console.log("🛒 [Test Add Bundle] Starting bundle purchase addition...")

  try {
    const body = await request.json()
    console.log("📋 [Test Add Bundle] Request body:", body)

    const { bundleId, bundleData } = body

    console.log("🔄 [Test API] Adding bundle to purchases:", { bundleId, bundleData })

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    // For testing, we'll use a mock user ID
    const mockUserId = "test-user-123"

    // Add bundle to purchases with metadata
    const purchaseId = await purchaseService.addBundleToPurchases(mockUserId, bundleId, {
      bundleTitle: bundleData?.title || "Unknown Bundle",
      bundlePrice: bundleData?.price || 0,
      creatorName: bundleData?.creatorName || "Unknown Creator",
      testPurchase: true,
      addedAt: new Date().toISOString(),
    })

    console.log("✅ [Test API] Bundle added to purchases successfully:", purchaseId)

    return NextResponse.json({
      success: true,
      purchaseId,
      message: "Bundle added to purchases successfully",
      data: {
        userId: mockUserId,
        bundleId,
        bundleTitle: bundleData?.title || "Unknown Bundle",
      },
    })
  } catch (error: any) {
    console.error("❌ [Test Add Bundle] Error adding bundle to purchases:", error)
    console.error("❌ [Test Add Bundle] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Failed to add bundle to purchases",
        details: error.message || "Unknown error occurred",
        code: error.code || "INTERNAL_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
