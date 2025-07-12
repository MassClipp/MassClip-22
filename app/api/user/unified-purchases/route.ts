import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized", purchases: [] }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Invalid token", purchases: [] }, { status: 401 })
    }

    let userId: string
    try {
      const { getAuth } = await import("firebase-admin/auth")
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
    } catch (authError: any) {
      console.error("Token verification failed:", authError)
      return NextResponse.json({ error: "Authentication failed", purchases: [] }, { status: 401 })
    }

    let db: any
    try {
      const { db: adminDb } = await import("@/lib/firebase-admin")
      db = adminDb
    } catch (dbError: any) {
      console.error("Database connection failed:", dbError)
      return NextResponse.json({ error: "Database connection failed", purchases: [] }, { status: 500 })
    }

    const collections = ["bundlePurchases", "unifiedPurchases", "productBoxPurchases", "purchases"]
    const allPurchases: any[] = []

    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).where("buyerUid", "==", userId).get()
        if (!snapshot.empty) {
          snapshot.docs.forEach((doc: any) => {
            allPurchases.push({
              id: doc.id,
              ...doc.data(),
              source: collectionName,
            })
          })
        }
      } catch (error) {
        console.warn(`Error checking ${collectionName}:`, error)
      }

      try {
        const snapshot = await db.collection(collectionName).where("userId", "==", userId).get()
        if (!snapshot.empty) {
          snapshot.docs.forEach((doc: any) => {
            const exists = allPurchases.some((p) => p.id === doc.id)
            if (!exists) {
              allPurchases.push({
                id: doc.id,
                ...doc.data(),
                source: collectionName,
              })
            }
          })
        }
      } catch (error) {
        console.warn(`Error checking ${collectionName} with userId:`, error)
      }
    }

    const uniquePurchases = allPurchases.filter((purchase, index, self) => {
      const identifier = purchase.productBoxId || purchase.bundleId || purchase.sessionId
      return index === self.findIndex((p) => (p.productBoxId || p.bundleId || p.sessionId) === identifier)
    })

    return NextResponse.json({
      purchases: uniquePurchases,
      total: uniquePurchases.length,
    })
  } catch (error: any) {
    console.error("Unified purchases API error:", error)
    return NextResponse.json({ error: "Internal server error", purchases: [] }, { status: 500 })
  }
}
