import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

/**
 * 🎯 READ ONLY: Check user access to content
 * This route ONLY checks access - it does NOT create purchases or grant access
 * All purchase creation is handled exclusively by Stripe webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const decodedToken = await requireAuth(request)
    const { itemId, bundleId, productBoxId } = await request.json()

    const userId = decodedToken.uid
    const targetItemId = itemId || bundleId || productBoxId

    if (!targetItemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Check Access] READ ONLY - Checking access for user ${userId} to item ${targetItemId}`)

    // Use the read-only service to check access
    const accessResult = await UnifiedPurchaseService.checkUserAccess(userId, targetItemId)

    console.log(`✅ [Check Access] Access check result:`, {
      hasAccess: accessResult.hasAccess,
      purchaseId: accessResult.purchaseId,
    })

    return NextResponse.json({
      success: true,
      hasAccess: accessResult.hasAccess,
      purchaseId: accessResult.purchaseId,
      itemId: targetItemId,
      message: accessResult.hasAccess ? "User has access" : "User does not have access",
      note: "This is a read-only endpoint. Access is granted only via Stripe webhook purchases.",
    })
  } catch (error: any) {
    console.error("❌ [Check Access] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
