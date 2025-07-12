import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 [Unified Purchases] Fetching purchases for user: ${userId}`)

    // Try multiple collections to find purchases
    const collections = ["bundlePurchases", "unifiedPurchases", "productBoxPurchases", "purchases"]

    let allPurchases: any[] = []

    for (const collectionName of collections) {
      try {
        console.log(`🔍 [Unified Purchases] Checking collection: ${collectionName}`)

        const snapshot = await db.collection(collectionName).where("buyerUid", "==", userId).get()

        if (!snapshot.empty) {
          const purchases = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            source: collectionName,
          }))

          allPurchases = [...allPurchases, ...purchases]
          console.log(`✅ [Unified Purchases] Found ${purchases.length} purchases in ${collectionName}`)
        }
      } catch (error) {
        console.warn(`⚠️ [Unified Purchases] Error checking ${collectionName}:`, error)
      }
    }

    // Also try with userId field
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).where("userId", "==", userId).get()

        if (!snapshot.empty) {
          const purchases = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            source: collectionName,
          }))

          // Avoid duplicates
          const newPurchases = purchases.filter((p) => !allPurchases.some((existing) => existing.id === p.id))

          allPurchases = [...allPurchases, ...newPurchases]
          console.log(`✅ [Unified Purchases] Found ${newPurchases.length} additional purchases in ${collectionName}`)
        }
      } catch (error) {
        console.warn(`⚠️ [Unified Purchases] Error checking ${collectionName} with userId:`, error)
      }
    }

    // Remove duplicates based on productBoxId or sessionId
    const uniquePurchases = allPurchases.filter((purchase, index, self) => {
      const identifier = purchase.productBoxId || purchase.bundleId || purchase.sessionId
      return index === self.findIndex((p) => (p.productBoxId || p.bundleId || p.sessionId) === identifier)
    })

    console.log(`✅ [Unified Purchases] Returning ${uniquePurchases.length} unique purchases`)

    return NextResponse.json({
      purchases: uniquePurchases,
      total: uniquePurchases.length,
      sources: [...new Set(allPurchases.map((p) => p.source))],
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases] Error:", error)
    return NextResponse.json({ error: "Failed to fetch purchases", details: error.message }, { status: 500 })
  }
}
