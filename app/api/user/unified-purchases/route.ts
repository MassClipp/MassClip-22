import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Unified Purchases API] Starting request`)

    // Check authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(`⚠️ [Unified Purchases API] Missing or invalid authorization header`)
      return NextResponse.json({ error: "Unauthorized", purchases: [] }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      console.warn(`⚠️ [Unified Purchases API] Empty token`)
      return NextResponse.json({ error: "Invalid token", purchases: [] }, { status: 401 })
    }

    // Try to verify token and get user ID
    let userId: string
    try {
      // Dynamic import to handle potential Firebase issues
      const { getAuth } = await import("firebase-admin/auth")
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
      console.log(`✅ [Unified Purchases API] Token verified for user: ${userId}`)
    } catch (authError: any) {
      console.error(`❌ [Unified Purchases API] Token verification failed:`, authError)
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: authError.message,
          purchases: [],
        },
        { status: 401 },
      )
    }

    // Try to get Firebase admin DB
    let db: any
    try {
      const { db: adminDb } = await import("@/lib/firebase-admin")
      db = adminDb
      console.log(`✅ [Unified Purchases API] Firebase admin DB connected`)
    } catch (dbError: any) {
      console.error(`❌ [Unified Purchases API] Firebase admin DB connection failed:`, dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError.message,
          purchases: [],
        },
        { status: 500 },
      )
    }

    // Collections to check for purchases
    const collections = ["bundlePurchases", "unifiedPurchases", "productBoxPurchases", "purchases"]

    let allPurchases: any[] = []
    const errors: string[] = []

    // Try each collection with both buyerUid and userId
    for (const collectionName of collections) {
      for (const fieldName of ["buyerUid", "userId"]) {
        try {
          console.log(`🔍 [Unified Purchases API] Checking ${collectionName} with ${fieldName}`)

          const snapshot = await db.collection(collectionName).where(fieldName, "==", userId).get()

          if (!snapshot.empty) {
            const purchases = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
              source: collectionName,
              queryField: fieldName,
            }))

            allPurchases = [...allPurchases, ...purchases]
            console.log(
              `✅ [Unified Purchases API] Found ${purchases.length} purchases in ${collectionName} with ${fieldName}`,
            )
          }
        } catch (collectionError: any) {
          const errorMsg = `Error checking ${collectionName} with ${fieldName}: ${collectionError.message}`
          console.warn(`⚠️ [Unified Purchases API] ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
    }

    // Remove duplicates based on multiple possible identifiers
    const uniquePurchases = allPurchases.filter((purchase, index, self) => {
      const identifiers = [
        purchase.id,
        purchase.productBoxId,
        purchase.bundleId,
        purchase.sessionId,
        purchase.purchaseId,
      ].filter(Boolean)

      const primaryId = identifiers[0]
      if (!primaryId) return false

      return (
        index ===
        self.findIndex((p) => {
          const pIdentifiers = [p.id, p.productBoxId, p.bundleId, p.sessionId, p.purchaseId].filter(Boolean)

          return pIdentifiers.some((id) => identifiers.includes(id))
        })
      )
    })

    console.log(`✅ [Unified Purchases API] Returning ${uniquePurchases.length} unique purchases`)

    return NextResponse.json({
      purchases: uniquePurchases,
      total: uniquePurchases.length,
      sources: [...new Set(allPurchases.map((p) => p.source))],
      userId,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases API] Critical error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        purchases: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
