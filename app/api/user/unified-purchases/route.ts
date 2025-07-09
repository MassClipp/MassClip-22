import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Starting request")

    // Get authenticated user
    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Unified Purchases] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.uid
    console.log(`✅ [Unified Purchases] User authenticated: ${userId}`)

    try {
      // Try to get purchases from the unified collection first
      console.log(`🔍 [Unified Purchases] Checking userPurchases collection for user: ${userId}`)

      const unifiedPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")
      const unifiedSnapshot = await unifiedPurchasesRef.orderBy("purchasedAt", "desc").limit(50).get()

      let purchases: any[] = []

      if (!unifiedSnapshot.empty) {
        console.log(`✅ [Unified Purchases] Found ${unifiedSnapshot.size} purchases in unified collection`)
        purchases = unifiedSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          purchasedAt: doc.data().purchasedAt?.toDate?.() || new Date(doc.data().purchasedAt),
        }))
      } else {
        console.log(`🔍 [Unified Purchases] No purchases in unified collection, checking user subcollection`)

        // Fallback to user's purchases subcollection
        const userPurchasesRef = db.collection("users").doc(userId).collection("purchases")
        const userSnapshot = await userPurchasesRef.orderBy("purchasedAt", "desc").limit(50).get()

        if (!userSnapshot.empty) {
          console.log(`✅ [Unified Purchases] Found ${userSnapshot.size} purchases in user subcollection`)
          purchases = userSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            purchasedAt: doc.data().purchasedAt?.toDate?.() || new Date(doc.data().purchasedAt),
          }))
        } else {
          console.log(`ℹ️ [Unified Purchases] No purchases found for user: ${userId}`)
        }
      }

      // Process and enrich purchase data
      const enrichedPurchases = purchases.map((purchase) => ({
        id: purchase.id,
        productBoxId: purchase.productBoxId || purchase.itemId,
        sessionId: purchase.sessionId,
        amount: purchase.amount || 0,
        currency: purchase.currency || "usd",
        status: purchase.status || "completed",
        itemTitle: purchase.itemTitle || "Unknown Item",
        itemDescription: purchase.itemDescription || "",
        thumbnailUrl: purchase.thumbnailUrl || "",
        purchasedAt: purchase.purchasedAt,
        isTestPurchase: purchase.isTestPurchase || false,
        type: purchase.type || "product_box",
      }))

      console.log(`✅ [Unified Purchases] Returning ${enrichedPurchases.length} purchases`)

      return NextResponse.json({
        success: true,
        purchases: enrichedPurchases,
        total: enrichedPurchases.length,
        source: unifiedSnapshot.empty ? "user_subcollection" : "unified_collection",
      })
    } catch (firestoreError: any) {
      console.error("❌ [Unified Purchases] Firestore error:", firestoreError)

      // Return empty data instead of error to prevent UI issues
      return NextResponse.json({
        success: true,
        purchases: [],
        total: 0,
        error: "Failed to fetch purchases from database",
        details: firestoreError.message,
      })
    }
  } catch (error: any) {
    console.error("❌ [Unified Purchases] Unexpected error:", error)

    // Return empty data instead of 500 error
    return NextResponse.json({
      success: true,
      purchases: [],
      total: 0,
      error: "Unexpected error occurred",
      details: error.message,
    })
  }
}
