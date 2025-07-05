import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🛒 [Unified Purchases] Starting fetch...")

    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")

    let authenticatedUserId: string | null = null

    // Verify auth token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
        console.log("✅ [Unified Purchases API] Authenticated user:", authenticatedUserId)
      } catch (error) {
        console.error("❌ [Unified Purchases API] Error verifying auth token:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    }

    // Use provided userId or authenticated userId
    const finalUserId = userId || authenticatedUserId

    if (!finalUserId) {
      console.error("❌ [Unified Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Unified Purchases API] Fetching purchases for user:", finalUserId)

    // Try multiple approaches to find purchases
    const purchases = []

    // 1. Check userPurchases collection (new structure)
    try {
      const unifiedPurchasesRef = db.collection("userPurchases").doc(finalUserId).collection("purchases")
      const unifiedSnapshot = await unifiedPurchasesRef.orderBy("purchasedAt", "desc").get()

      console.log(`📊 [Unified Purchases API] Found ${unifiedSnapshot.size} unified purchases`)

      unifiedSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        purchases.push({
          id: doc.id,
          ...data,
          purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt || Date.now()),
          createdAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt || Date.now()),
        })
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases API] Error fetching from userPurchases:", error)
    }

    // 2. Check legacy purchases collection
    try {
      const legacyPurchasesQuery = db
        .collection("purchases")
        .where("userId", "==", finalUserId)
        .where("status", "==", "completed")
        .orderBy("createdAt", "desc")

      const legacySnapshot = await legacyPurchasesQuery.get()
      console.log(`📊 [Unified Purchases API] Found ${legacySnapshot.size} legacy purchases`)

      legacySnapshot.docs.forEach((doc) => {
        const data = doc.data()
        // Only add if not already in purchases array
        if (!purchases.find((p) => p.id === doc.id)) {
          purchases.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
            purchasedAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases API] Error fetching from legacy purchases:", error)
    }

    // 3. Check productBoxPurchases collection
    try {
      const productBoxPurchasesQuery = db
        .collection("productBoxPurchases")
        .where("userId", "==", finalUserId)
        .where("status", "==", "completed")
        .orderBy("createdAt", "desc")

      const productBoxSnapshot = await productBoxPurchasesQuery.get()
      console.log(`📊 [Unified Purchases API] Found ${productBoxSnapshot.size} product box purchases`)

      productBoxSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        // Only add if not already in purchases array
        if (!purchases.find((p) => p.id === doc.id)) {
          purchases.push({
            id: doc.id,
            ...data,
            type: "product_box",
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
            purchasedAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Unified Purchases API] Error fetching from productBoxPurchases:", error)
    }

    console.log(`✅ [Unified Purchases API] Total purchases found: ${purchases.length}`)

    // If no purchases found, return empty array with success
    if (purchases.length === 0) {
      console.log("ℹ️ [Unified Purchases API] No purchases found for user")
      return NextResponse.json({
        purchases: [],
        total: 0,
        message: "No purchases found",
      })
    }

    // Sort by date and return
    purchases.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.purchasedAt)
      const dateB = new Date(b.createdAt || b.purchasedAt)
      return dateB.getTime() - dateA.getTime()
    })

    console.log("✅ [Unified Purchases API] Returning", purchases.length, "purchases")
    return NextResponse.json({
      purchases,
      total: purchases.length,
      totalValue: purchases.reduce((sum, p) => sum + (p.price || 0), 0),
    })
  } catch (error) {
    console.error("❌ [Unified Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch unified purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
