import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug] Checking bundlePurchases collection...")

    // Get all documents in bundlePurchases collection
    const snapshot = await db.collection("bundlePurchases").get()

    console.log(`📊 [Debug] Found ${snapshot.size} documents in bundlePurchases`)

    const purchases: any[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      purchases.push({
        id: doc.id,
        buyerUid: data.buyerUid,
        title: data.title,
        amount: data.amount,
        createdAt: data.createdAt,
        sessionId: data.sessionId,
      })
    })

    // Also check if there are any indexes
    const collections = await db.listCollections()
    const collectionNames = collections.map((col) => col.id)

    return NextResponse.json({
      success: true,
      totalPurchases: snapshot.size,
      purchases: purchases,
      availableCollections: collectionNames,
      bundlePurchasesExists: collectionNames.includes("bundlePurchases"),
    })
  } catch (error: any) {
    console.error("❌ [Debug] Error checking bundlePurchases:", error)

    return NextResponse.json(
      {
        error: "Failed to check bundlePurchases",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
