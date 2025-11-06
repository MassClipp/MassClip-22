/**
 * 🎯 UNIFIED PURCHASE SERVICE - READ ONLY
 * This service ONLY reads purchase data from the database
 * It does NOT create purchases - that's handled exclusively by Stripe webhooks
 */
export class UnifiedPurchaseService {
  /**
   * Get user's purchase by payment intent ID
   * READ ONLY - does not create purchases
   */
  static async getUserPurchaseByPaymentIntent(userId: string, paymentIntentId: string) {
    const { db } = await import("@/lib/firebase-admin")

    try {
      console.log(`🔍 [Purchase Service] Looking up purchase by payment intent: ${paymentIntentId}`)

      // Check bundlePurchases collection (primary source)
      const bundlePurchasesQuery = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .where("paymentIntentId", "==", paymentIntentId)
        .limit(1)
        .get()

      if (!bundlePurchasesQuery.empty) {
        const purchaseDoc = bundlePurchasesQuery.docs[0]
        console.log(`✅ [Purchase Service] Found purchase in bundlePurchases: ${purchaseDoc.id}`)
        return {
          id: purchaseDoc.id,
          ...purchaseDoc.data(),
        }
      }

      console.log(`❌ [Purchase Service] No purchase found for payment intent: ${paymentIntentId}`)
      return null
    } catch (error) {
      console.error("❌ [Purchase Service] Error looking up purchase:", error)
      return null
    }
  }

  /**
   * Get user's purchase by session ID
   * READ ONLY - does not create purchases
   */
  static async getUserPurchaseBySessionId(userId: string, sessionId: string) {
    const { db } = await import("@/lib/firebase-admin")

    try {
      console.log(`🔍 [Purchase Service] Looking up purchase by session ID: ${sessionId}`)

      // Check bundlePurchases collection first (using sessionId as document ID)
      const bundlePurchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()
      if (bundlePurchaseDoc.exists) {
        const purchaseData = bundlePurchaseDoc.data()!
        if (purchaseData.buyerUid === userId) {
          console.log(`✅ [Purchase Service] Found purchase in bundlePurchases: ${sessionId}`)
          return {
            id: bundlePurchaseDoc.id,
            ...purchaseData,
          }
        }
      }

      console.log(`❌ [Purchase Service] No purchase found for session: ${sessionId}`)
      return null
    } catch (error) {
      console.error("❌ [Purchase Service] Error looking up purchase:", error)
      return null
    }
  }

  /**
   * Get all user purchases
   * READ ONLY - does not create purchases
   */
  static async getUserPurchases(userId: string) {
    const { db } = await import("@/lib/firebase-admin")

    try {
      console.log(`🔍 [Purchase Service] Getting all purchases for user: ${userId}`)

      const purchases: any[] = []

      // Get from bundlePurchases collection (primary source)
      const bundlePurchasesQuery = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

      bundlePurchasesQuery.forEach((doc) => {
        purchases.push({
          id: doc.id,
          source: "bundlePurchases",
          ...doc.data(),
        })
      })

      console.log(`✅ [Purchase Service] Found ${purchases.length} purchases for user`)
      return purchases
    } catch (error) {
      console.error("❌ [Purchase Service] Error getting user purchases:", error)
      return []
    }
  }

  /**
   * Check if user has access to a product/bundle
   * READ ONLY - does not create purchases
   */
  static async checkUserAccess(userId: string, itemId: string) {
    const { db } = await import("@/lib/firebase-admin")

    try {
      console.log(`🔍 [Purchase Service] Checking access for user ${userId} to item ${itemId}`)

      // Check bundlePurchases collection
      const bundlePurchasesQuery = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .where("status", "==", "completed")
        .get()

      for (const doc of bundlePurchasesQuery.docs) {
        const data = doc.data()
        if (data.itemId === itemId || data.bundleId === itemId || data.productBoxId === itemId) {
          console.log(`✅ [Purchase Service] User has access via bundlePurchases: ${doc.id}`)
          return {
            hasAccess: true,
            purchaseId: doc.id,
            purchaseData: data,
          }
        }
      }

      console.log(`❌ [Purchase Service] User does not have access to item: ${itemId}`)
      return {
        hasAccess: false,
        purchaseId: null,
        purchaseData: null,
      }
    } catch (error) {
      console.error("❌ [Purchase Service] Error checking user access:", error)
      return {
        hasAccess: false,
        purchaseId: null,
        purchaseData: null,
      }
    }
  }
}
