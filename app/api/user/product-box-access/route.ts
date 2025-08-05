import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Product Box Access] Checking access for user: ${userId}`)

    // Get all purchases for this user
    const purchasesQuery = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("status", "==", "completed")
      .get()

    const accessibleProductBoxes = purchasesQuery.docs.map((doc) => {
      const data = doc.data()
      return {
        productBoxId: data.productBoxId,
        purchaseId: doc.id,
        type: data.type,
        purchasedAt: data.createdAt,
      }
    })

    console.log(`✅ [Product Box Access] Found ${accessibleProductBoxes.length} accessible product boxes`)

    return NextResponse.json({
      success: true,
      accessibleProductBoxes,
    })
  } catch (error) {
    console.error("❌ [Product Box Access] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check product box access",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
