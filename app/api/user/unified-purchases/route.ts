import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Starting fetch")

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Unified Purchases] Missing or invalid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify the ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Unified Purchases] User authenticated:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Unified Purchases] Error verifying ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const purchases: any[] = []

    try {
      // Fetch from user's purchases subcollection
      console.log("📦 [Unified Purchases] Fetching user purchases...")
      const userPurchasesRef = db.collection("users").doc(userId).collection("purchases")
      const userPurchasesSnapshot = await userPurchasesRef.orderBy("timestamp", "desc").get()

      console.log(`📦 [Unified Purchases] Found ${userPurchasesSnapshot.size} user purchases`)

      for (const doc of userPurchasesSnapshot.docs) {
        const purchaseData = doc.data()

        // Get product box details
        let productBoxData = null
        if (purchaseData.productBoxId) {
          try {
            const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
            if (productBoxDoc.exists) {
              productBoxData = productBoxDoc.data()
            }
          } catch (error) {
            console.warn(`⚠️ [Unified Purchases] Could not fetch product box ${purchaseData.productBoxId}:`, error)
          }
        }

        // Get creator details
        let creatorData = null
        const creatorId = purchaseData.creatorId || productBoxData?.creatorId
        if (creatorId) {
          try {
            const creatorDoc = await db.collection("users").doc(creatorId).get()
            if (creatorDoc.exists) {
              creatorData = creatorDoc.data()
            }
          } catch (error) {
            console.warn(`⚠️ [Unified Purchases] Could not fetch creator ${creatorId}:`, error)
          }
        }

        purchases.push({
          id: doc.id,
          productBoxId: purchaseData.productBoxId,
          itemTitle: productBoxData?.title || purchaseData.itemTitle || "Unknown Item",
          itemDescription: productBoxData?.description || purchaseData.itemDescription,
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          purchasedAt: purchaseData.timestamp?.toDate() || new Date(),
          status: purchaseData.status || "completed",
          thumbnailUrl: productBoxData?.thumbnailUrl,
          creatorUsername: creatorData?.username,
          creatorName: creatorData?.displayName || creatorData?.name,
          type: "product_box",
          sessionId: purchaseData.sessionId,
        })
      }

      // Also check legacy purchases collection (if it exists)
      try {
        console.log("🔍 [Unified Purchases] Checking legacy purchases...")
        const legacyPurchasesRef = db.collection("purchases").where("buyerUid", "==", userId)
        const legacyPurchasesSnapshot = await legacyPurchasesRef.orderBy("purchasedAt", "desc").get()

        console.log(`📦 [Unified Purchases] Found ${legacyPurchasesSnapshot.size} legacy purchases`)

        for (const doc of legacyPurchasesSnapshot.docs) {
          const purchaseData = doc.data()

          // Check if we already have this purchase (avoid duplicates)
          const existingPurchase = purchases.find(
            (p) =>
              p.sessionId === purchaseData.sessionId ||
              (p.productBoxId === purchaseData.productBoxId &&
                Math.abs(new Date(p.purchasedAt).getTime() - purchaseData.purchasedAt?.toDate()?.getTime()) < 60000),
          )

          if (!existingPurchase) {
            // Get product box details
            let productBoxData = null
            if (purchaseData.productBoxId) {
              try {
                const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
                if (productBoxDoc.exists) {
                  productBoxData = productBoxDoc.data()
                }
              } catch (error) {
                console.warn(`⚠️ [Unified Purchases] Could not fetch product box ${purchaseData.productBoxId}:`, error)
              }
            }

            // Get creator details
            let creatorData = null
            const creatorId = purchaseData.creatorId || productBoxData?.creatorId
            if (creatorId) {
              try {
                const creatorDoc = await db.collection("users").doc(creatorId).get()
                if (creatorDoc.exists) {
                  creatorData = creatorDoc.data()
                }
              } catch (error) {
                console.warn(`⚠️ [Unified Purchases] Could not fetch creator ${creatorId}:`, error)
              }
            }

            purchases.push({
              id: doc.id,
              productBoxId: purchaseData.productBoxId,
              itemTitle: productBoxData?.title || purchaseData.itemTitle || "Unknown Item",
              itemDescription: productBoxData?.description || purchaseData.itemDescription,
              amount: purchaseData.amount || 0,
              currency: purchaseData.currency || "usd",
              purchasedAt: purchaseData.purchasedAt?.toDate() || new Date(),
              status: purchaseData.status || "completed",
              thumbnailUrl: productBoxData?.thumbnailUrl,
              creatorUsername: creatorData?.username,
              creatorName: creatorData?.displayName || creatorData?.name,
              type: "product_box",
              sessionId: purchaseData.sessionId,
            })
          }
        }
      } catch (legacyError) {
        console.warn("⚠️ [Unified Purchases] Could not fetch legacy purchases:", legacyError)
        // Don't fail the entire request for legacy purchases
      }

      // Sort by purchase date (newest first)
      purchases.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())

      console.log(`✅ [Unified Purchases] Successfully fetched ${purchases.length} total purchases`)

      return NextResponse.json({
        success: true,
        purchases,
        total: purchases.length,
        totalValue: purchases.reduce((sum, p) => sum + p.amount, 0),
      })
    } catch (firestoreError) {
      console.error("❌ [Unified Purchases] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Failed to fetch purchases from database",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Unified Purchases] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
