import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug] Checking bundlePurchases collection...")

    // Check if collection exists and get sample data
    const purchasesSnapshot = await db.collection("bundlePurchases").limit(10).get()

    console.log(`📊 [Debug] Found ${purchasesSnapshot.size} documents in bundlePurchases`)

    const purchases: any[] = []
    purchasesSnapshot.forEach((doc) => {
      const data = doc.data()
      purchases.push({
        id: doc.id,
        buyerUid: data.buyerUid,
        title: data.title,
        amount: data.amount,
        sessionId: data.sessionId,
        purchasedAt: data.purchasedAt,
        itemType: data.itemType,
      })
    })

    // Get list of all collections
    const collections = await db.listCollections()
    const collectionNames = collections.map((col) => col.id)

    // Test Firebase Admin connection
    const testDoc = await db.collection("test").doc("connection").get()

    return NextResponse.json({
      success: true,
      bundlePurchasesExists: purchasesSnapshot.size > 0,
      totalPurchases: purchasesSnapshot.size,
      purchases: purchases,
      availableCollections: collectionNames,
      firebaseAdminConnected: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ [Debug] Error checking bundlePurchases:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        firebaseAdminConnected: false,
        details: "Failed to connect to Firebase or query bundlePurchases collection",
      },
      { status: 500 },
    )
  }
}
