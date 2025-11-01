import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const itemId = searchParams.get("itemId")

    if (!userId || !itemId) {
      return NextResponse.json({ error: "User ID and Item ID are required" }, { status: 400 })
    }

    console.log(`🔍 [Check Access] Checking access for user ${userId} to item ${itemId}`)

    // Check bundlePurchases collection
    const bundlePurchasesQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("status", "==", "completed")
      .get()

    for (const doc of bundlePurchasesQuery.docs) {
      const data = doc.data()
      if (data.itemId === itemId || data.bundleId === itemId || data.productBoxId === itemId) {
        console.log(`✅ [Check Access] User has access via bundlePurchases: ${doc.id}`)
        return NextResponse.json({
          hasAccess: true,
          purchaseId: doc.id,
          purchaseData: data,
        })
      }
    }

    console.log(`❌ [Check Access] User does not have access to item: ${itemId}`)
    return NextResponse.json({
      hasAccess: false,
      purchaseId: null,
      purchaseData: null,
    })
  } catch (error: any) {
    console.error("❌ [Check Access] Error checking access:", error)
    return NextResponse.json(
      {
        hasAccess: false,
        error: "Failed to check access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
