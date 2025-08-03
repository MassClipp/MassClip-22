import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Purchase Verify] Starting session verification...")

    // Get session ID from query params
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      console.error("❌ [Purchase Verify] No session ID provided")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Purchase Verify] Looking for session:", sessionId)

    // Check if purchase exists in bundlePurchases collection
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      console.error("❌ [Purchase Verify] Purchase not found for session:", sessionId)
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const purchaseData = purchaseDoc.data()!
    console.log("✅ [Purchase Verify] Purchase found:", {
      sessionId,
      buyerUid: purchaseData.buyerUid,
      itemId: purchaseData.itemId,
      title: purchaseData.title,
    })

    return NextResponse.json({
      success: true,
      purchase: {
        sessionId: purchaseData.sessionId,
        buyerUid: purchaseData.buyerUid,
        itemId: purchaseData.itemId,
        itemType: purchaseData.itemType,
        title: purchaseData.title,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        accessUrl: purchaseData.accessUrl,
        purchasedAt: purchaseData.purchasedAt,
        environment: purchaseData.environment,
      },
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Error verifying session:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Purchase Verify] Manual purchase verification...")

    const body = await request.json()
    const { sessionId, buyerUid } = body

    if (!sessionId || !buyerUid) {
      return NextResponse.json({ error: "Session ID and buyer UID are required" }, { status: 400 })
    }

    // Verify the purchase exists and belongs to the user
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const purchaseData = purchaseDoc.data()!

    if (purchaseData.buyerUid !== buyerUid) {
      console.error("❌ [Purchase Verify] Buyer UID mismatch:", {
        expected: purchaseData.buyerUid,
        provided: buyerUid,
      })
      return NextResponse.json({ error: "Purchase does not belong to this user" }, { status: 403 })
    }

    console.log("✅ [Purchase Verify] Manual verification successful")
    return NextResponse.json({
      success: true,
      verified: true,
      purchase: purchaseData,
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Error in manual verification:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
