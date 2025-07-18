import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔍 [Debug Purchases] Checking purchases for user: ${userId}`)

    // Check all possible purchase collections
    const collections = ["productBoxPurchases", "unifiedPurchases", "purchases", "userPurchases"]

    const allPurchases: any[] = []

    for (const collectionName of collections) {
      try {
        console.log(`🔍 [Debug Purchases] Checking collection: ${collectionName}`)

        let query
        if (collectionName === "userPurchases") {
          // userPurchases has subcollections
          query = db.collection("userPurchases").doc(userId).collection("purchases")
        } else {
          // Other collections use buyerUid or userId field
          query = db.collection(collectionName).where("buyerUid", "==", userId)

          // Also try userId field
          const userIdQuery = db.collection(collectionName).where("userId", "==", userId)
          const userIdSnapshot = await userIdQuery.get()

          if (!userIdSnapshot.empty) {
            userIdSnapshot.forEach((doc) => {
              allPurchases.push({
                collection: collectionName,
                id: doc.id,
                data: doc.data(),
                queryField: "userId",
              })
            })
          }
        }

        const snapshot = await query.get()
        console.log(`✅ [Debug Purchases] Found ${snapshot.size} documents in ${collectionName}`)

        snapshot.forEach((doc) => {
          allPurchases.push({
            collection: collectionName,
            id: doc.id,
            data: doc.data(),
            queryField: collectionName === "userPurchases" ? "subcollection" : "buyerUid",
          })
        })
      } catch (error) {
        console.warn(`⚠️ [Debug Purchases] Error checking ${collectionName}:`, error)
      }
    }

    console.log(`✅ [Debug Purchases] Total purchases found: ${allPurchases.length}`)

    // Also check what collections exist
    const collectionsSnapshot = await db.listCollections()
    const availableCollections = collectionsSnapshot.map((col) => col.id)

    return NextResponse.json({
      userId,
      userEmail: decodedToken.email,
      totalPurchases: allPurchases.length,
      purchases: allPurchases,
      availableCollections,
      debug: {
        searchedCollections: collections,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error(`❌ [Debug Purchases] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to debug purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
