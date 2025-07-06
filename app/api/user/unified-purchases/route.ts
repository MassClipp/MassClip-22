import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Starting fetch")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Unified Purchases] Missing or invalid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let userId: string

    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log("✅ [Unified Purchases] User authenticated:", userId)
    } catch (error) {
      console.error("❌ [Unified Purchases] Error verifying ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const purchases: any[] = []
    let totalSpent = 0
    let thisMonthCount = 0
    const lastDownload: Date | null = null
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    try {
      // Get purchases from user's purchases subcollection
      console.log("📥 [Unified Purchases] Fetching user purchases...")
      const userPurchasesRef = db.collection("users").doc(userId).collection("purchases")
      const userPurchasesSnapshot = await userPurchasesRef.orderBy("timestamp", "desc").get()

      console.log(`📊 [Unified Purchases] Found ${userPurchasesSnapshot.size} user purchases`)

      for (const doc of userPurchasesSnapshot.docs) {
        const purchaseData = doc.data()
        console.log("🔍 Processing purchase:", doc.id, purchaseData)

        try {
          let itemTitle = "Unknown Item"
          let itemDescription = ""
          let thumbnailUrl = ""
          let creatorUsername = ""
          let creatorName = ""
          let type = "product_box"

          // Get product box details
          if (purchaseData.productBoxId) {
            const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
            if (productBoxDoc.exists) {
              const productBoxData = productBoxDoc.data()!
              itemTitle = productBoxData.title || itemTitle
              itemDescription = productBoxData.description || ""
              thumbnailUrl = productBoxData.thumbnailUrl || ""
              type = "product_box"

              // Get creator details
              if (productBoxData.creatorId) {
                const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
                if (creatorDoc.exists) {
                  const creatorData = creatorDoc.data()!
                  creatorUsername = creatorData.username || ""
                  creatorName = creatorData.displayName || creatorData.name || ""
                }
              }
            }
          }

          const purchaseDate = purchaseData.timestamp?.toDate() || new Date()
          const amount = purchaseData.amount || 0

          purchases.push({
            id: doc.id,
            type,
            itemId: purchaseData.productBoxId || doc.id,
            itemTitle,
            itemDescription,
            amount,
            currency: purchaseData.currency || "usd",
            purchasedAt: purchaseDate,
            status: purchaseData.status || "completed",
            thumbnailUrl,
            creatorUsername,
            creatorName,
            sessionId: purchaseData.sessionId,
            stripeMode: purchaseData.stripeMode,
            downloadCount: 0, // TODO: Track downloads
            tags: [], // TODO: Add tagging system
          })

          totalSpent += amount

          // Count this month's purchases
          if (purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear) {
            thisMonthCount++
          }
        } catch (itemError) {
          console.error(`⚠️ [Unified Purchases] Error processing purchase ${doc.id}:`, itemError)
          // Continue with other purchases even if one fails
        }
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
            try {
              let itemTitle = "Unknown Item"
              let itemDescription = ""
              let thumbnailUrl = ""
              let creatorUsername = ""
              let creatorName = ""
              let type = "product_box"

              // Get product box details
              if (purchaseData.productBoxId) {
                const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
                if (productBoxDoc.exists) {
                  const productBoxData = productBoxDoc.data()!
                  itemTitle = productBoxData.title || itemTitle
                  itemDescription = productBoxData.description || ""
                  thumbnailUrl = productBoxData.thumbnailUrl || ""
                  type = "product_box"

                  // Get creator details
                  if (productBoxData.creatorId) {
                    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
                    if (creatorDoc.exists) {
                      const creatorData = creatorDoc.data()!
                      creatorUsername = creatorData.username || ""
                      creatorName = creatorData.displayName || creatorData.name || ""
                    }
                  }
                }
              }

              const purchaseDate = purchaseData.purchasedAt?.toDate() || new Date()
              const amount = purchaseData.amount || 0

              purchases.push({
                id: doc.id,
                type,
                itemId: purchaseData.productBoxId || doc.id,
                itemTitle,
                itemDescription,
                amount,
                currency: purchaseData.currency || "usd",
                purchasedAt: purchaseDate,
                status: purchaseData.status || "completed",
                thumbnailUrl,
                creatorUsername,
                creatorName,
                sessionId: purchaseData.sessionId,
                stripeMode: purchaseData.stripeMode,
                downloadCount: 0, // TODO: Track downloads
                tags: [], // TODO: Add tagging system
              })

              totalSpent += amount

              // Count this month's purchases
              if (purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear) {
                thisMonthCount++
              }
            } catch (itemError) {
              console.error(`⚠️ [Unified Purchases] Error processing legacy purchase ${doc.id}:`, itemError)
              // Continue with other purchases even if one fails
            }
          }
        }
      } catch (legacyError) {
        console.warn("⚠️ [Unified Purchases] Could not fetch legacy purchases:", legacyError)
        // Don't fail the entire request for legacy purchases
      }

      console.log(`✅ [Unified Purchases] Processed ${purchases.length} total purchases`)
    } catch (error) {
      console.error("❌ [Unified Purchases] Error fetching purchases:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch purchases",
          details: error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 500 },
      )
    }

    const stats = {
      totalPurchases: purchases.length,
      totalSpent,
      currency: "usd", // TODO: Handle multiple currencies
      thisMonth: thisMonthCount,
      lastDownload: lastDownload,
    }

    console.log("📊 [Unified Purchases] Final stats:", stats)

    return NextResponse.json({
      purchases,
      stats,
      success: true,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    })

    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
