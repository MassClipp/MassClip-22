import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { productBoxId, legacyPurchaseData } = await request.json()

    if (!productBoxId || !legacyPurchaseData) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    console.log(`🔄 [Migration] Migrating legacy purchase for user ${userId}, product box ${productBoxId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Migration] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    // Create unified purchase from legacy data
    const sessionId = legacyPurchaseData.sessionId || `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      productBoxId: productBoxId,
      sessionId: sessionId,
      amount: legacyPurchaseData.amount || productBoxData.price || 0,
      currency: legacyPurchaseData.currency || productBoxData.currency || "usd",
      creatorId: legacyPurchaseData.creatorId || productBoxData.creatorId || "",
    })

    console.log(`✅ [Migration] Successfully migrated legacy purchase to unified format`)

    return NextResponse.json({
      success: true,
      message: "Purchase migrated successfully",
      sessionId: sessionId,
    })
  } catch (error: any) {
    console.error(`❌ [Migration] Error migrating purchase:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
