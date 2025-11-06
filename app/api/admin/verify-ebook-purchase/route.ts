import { NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request.headers)

    const { searchParams } = new URL(request.url)
    const ebookId = searchParams.get("ebookId")
    const userId = searchParams.get("userId")

    if (!ebookId) {
      return NextResponse.json({ error: "Missing ebookId parameter" }, { status: 400 })
    }

    console.log(`[v0] Verifying eBook purchase: ebookId=${ebookId}, userId=${userId}`)

    // Query ebookPurchases collection
    let query = adminDb.collection("ebookPurchases").where("ebookId", "==", ebookId)

    if (userId) {
      query = query.where("buyerUid", "==", userId)
    }

    const snapshot = await query.get()

    const purchases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || null,
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
    }))

    console.log(`[v0] Found ${purchases.length} purchase(s) for eBook ${ebookId}`)

    return NextResponse.json({
      hasPurchase: purchases.length > 0,
      purchaseCount: purchases.length,
      purchases,
      ebookId,
      userId,
    })
  } catch (error) {
    console.error("[v0] Error verifying eBook purchase:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
