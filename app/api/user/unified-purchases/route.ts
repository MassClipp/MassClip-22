import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Fetching user purchases...")

    // Extract and verify Firebase ID token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Unified Purchases] Firebase token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Unified Purchases] Firebase token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    console.log("🔍 [Unified Purchases] Looking up purchases for user:", { userId, userEmail })

    // Query bundlePurchases by userId
    const bundlePurchasesQuery = await db.collection("bundlePurchases").where("userId", "==", userId).get()

    // Also query by email as fallback for purchases that might have been created before user ID was properly set
    const emailPurchasesQuery = userEmail
      ? await db.collection("bundlePurchases").where("userEmail", "==", userEmail).get()
      : { docs: [] }

    // Combine and deduplicate purchases
    const allPurchases = new Map()

    // Add purchases found by userId
    bundlePurchasesQuery.docs.forEach((doc) => {
      const data = doc.data()
      allPurchases.set(doc.id, {
        id: doc.id,
        ...data,
        source: "userId_match",
      })
    })

    // Add purchases found by email (if not already added)
    emailPurchasesQuery.docs.forEach((doc) => {
      if (!allPurchases.has(doc.id)) {
        const data = doc.data()
        allPurchases.set(doc.id, {
          id: doc.id,
          ...data,
          source: "email_match",
        })

        // Update this purchase with the correct userId for future queries
        if (data.userId === "anonymous") {
          console.log("🔄 [Unified Purchases] Updating anonymous purchase with user ID:", doc.id)
          doc.ref
            .update({
              userId: userId,
              buyerUid: userId,
              isAuthenticated: true,
              updatedAt: new Date(),
            })
            .catch((error) => {
              console.error("❌ [Unified Purchases] Failed to update purchase:", error)
            })
        }
      }
    })

    const purchases = Array.from(allPurchases.values())

    console.log(`✅ [Unified Purchases] Found ${purchases.length} purchases for user ${userId}`)

    // Transform purchases for frontend consumption
    const transformedPurchases = purchases.map((purchase) => ({
      id: purchase.id,
      bundleId: purchase.bundleId || purchase.productBoxId,
      bundleTitle: purchase.bundleTitle || purchase.productTitle || "Untitled Bundle",
      bundleDescription: purchase.bundleDescription || purchase.productDescription || "",
      thumbnailUrl: purchase.thumbnailUrl || purchase.customPreviewThumbnail || "",
      contents: purchase.contents || purchase.items || [],
      contentCount: purchase.contentCount || purchase.totalItems || 0,
      amount: purchase.amount || 0,
      currency: purchase.currency || "usd",
      purchasedAt: purchase.purchasedAt || purchase.createdAt,
      status: purchase.status || "completed",
      sessionId: purchase.sessionId || purchase.id,
      accessUrl: `/product-box/${purchase.bundleId || purchase.productBoxId}/content`,
      source: purchase.source,
    }))

    return NextResponse.json({
      success: true,
      purchases: transformedPurchases,
      totalPurchases: transformedPurchases.length,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
