import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Anonymous Purchases] Fetching anonymous purchases...")

    const url = new URL(request.url)
    const sessionId = url.searchParams.get("sessionId")
    const email = url.searchParams.get("email")

    console.log("📝 [Anonymous Purchases] Query params:", { sessionId, email })

    const purchases = []

    // Strategy 1: Look up by session ID
    if (sessionId) {
      console.log("🔍 [Anonymous Purchases] Looking up by session ID:", sessionId)

      // Check multiple collections for the session
      const collections = ["bundlePurchases", "unifiedPurchases", "sessionPurchases"]

      for (const collectionName of collections) {
        try {
          const purchaseDoc = await db.collection(collectionName).doc(sessionId).get()

          if (purchaseDoc.exists) {
            const purchaseData = purchaseDoc.data()
            console.log(`✅ [Anonymous Purchases] Found purchase in ${collectionName}:`, purchaseData?.productBoxTitle)

            purchases.push({
              id: purchaseDoc.id,
              ...purchaseData,
              source: collectionName,
              anonymousAccess: true,
            })
            break // Found it, no need to check other collections
          }
        } catch (error) {
          console.warn(`⚠️ [Anonymous Purchases] Error checking ${collectionName}:`, error)
        }
      }
    }

    // Strategy 2: Look up by email if no session ID or no results
    if (purchases.length === 0 && email) {
      console.log("🔍 [Anonymous Purchases] Looking up by email:", email)

      try {
        const emailQuery = await db
          .collection("bundlePurchases")
          .where("userEmail", "==", email)
          .orderBy("purchasedAt", "desc")
          .limit(10)
          .get()

        emailQuery.forEach((doc) => {
          const purchaseData = doc.data()
          console.log(`✅ [Anonymous Purchases] Found purchase by email:`, purchaseData?.productBoxTitle)

          purchases.push({
            id: doc.id,
            ...purchaseData,
            source: "bundlePurchases (email)",
            anonymousAccess: true,
          })
        })
      } catch (error) {
        console.warn("⚠️ [Anonymous Purchases] Error querying by email:", error)
      }
    }

    // Strategy 3: Check recent purchases from cookies/session
    if (purchases.length === 0) {
      console.log("🔍 [Anonymous Purchases] Checking recent session purchases...")

      try {
        // Get recent purchases from the last 7 days
        const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const recentQuery = await db
          .collection("sessionPurchases")
          .where("createdAt", ">=", recentDate)
          .orderBy("createdAt", "desc")
          .limit(5)
          .get()

        recentQuery.forEach((doc) => {
          const purchaseData = doc.data()
          console.log(`✅ [Anonymous Purchases] Found recent purchase:`, purchaseData?.productBoxTitle)

          purchases.push({
            id: doc.id,
            ...purchaseData,
            source: "sessionPurchases (recent)",
            anonymousAccess: true,
          })
        })
      } catch (error) {
        console.warn("⚠️ [Anonymous Purchases] Error querying recent purchases:", error)
      }
    }

    console.log(`📊 [Anonymous Purchases] Found ${purchases.length} purchases`)

    return NextResponse.json({
      success: true,
      purchases: purchases,
      count: purchases.length,
      queryMethod: sessionId ? "sessionId" : email ? "email" : "recent",
    })
  } catch (error) {
    console.error("❌ [Anonymous Purchases] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch anonymous purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
