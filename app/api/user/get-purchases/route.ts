import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

/**
 * 🎯 READ ONLY: Get user purchases
 * This route ONLY reads purchase data - it does NOT create purchases
 * All purchase creation is handled exclusively by Stripe webhooks
 */
export async function GET(request: NextRequest) {
  console.log("📖 [Get Purchases] Starting read-only request...")

  try {
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid

    console.log(`🔍 [Get Purchases] READ ONLY - Getting purchases for user: ${userId}`)

    // Use the read-only service to get purchases
    const purchases = await UnifiedPurchaseService.getUserPurchases(userId)

    console.log(`✅ [Get Purchases] Found ${purchases.length} purchases for user`)

    return NextResponse.json({
      success: true,
      purchases,
      count: purchases.length,
      message: "Purchases retrieved successfully",
      note: "This is a read-only endpoint. Purchases are created only via Stripe webhooks.",
    })
  } catch (error: any) {
    console.error("❌ [Get Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to get purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
