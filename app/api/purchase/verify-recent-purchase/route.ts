import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, buyerUid, creatorId } = await request.json()

    console.log("🔍 [Recent Purchase] Verifying recent purchase:", {
      productBoxId,
      buyerUid,
      creatorId,
    })

    // Get authenticated user if available
    let authenticatedUser = null
    try {
      authenticatedUser = await verifyIdToken(request)
      console.log("✅ [Recent Purchase] Authenticated user:", authenticatedUser?.uid)
    } catch (error) {
      console.log("ℹ️ [Recent Purchase] No authenticated user")
    }

    const userIdToCheck = authenticatedUser?.uid || buyerUid

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    // Search for recent purchases in multiple collections
    const searchPromises = []

    // 1. Search in bundlePurchases collection
    if (userIdToCheck) {
      searchPromises.push(
        db
          .collection("bundlePurchases")
          .where("buyerUid", "==", userIdToCheck)
          .where("bundleId", "==", productBoxId)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get(),
      )
    }

    // 2. Search in checkoutAttempts for recent sessions
    searchPromises.push(
      db
        .collection("checkoutAttempts")
        .where("productBoxId", "==", productBoxId)
        .where("status", "==", "created")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
    )

    // 3. Search in purchases collection
    if (userIdToCheck) {
      searchPromises.push(
        db
          .collection("purchases")
          .where("buyerUid", "==", userIdToCheck)
          .where("productBoxId", "==", productBoxId)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get(),
      )
    }

    const searchResults = await Promise.all(searchPromises)

    // Check bundlePurchases first
    if (searchResults[0] && !searchResults[0].empty) {
      const purchaseDoc = searchResults[0].docs[0]
      const purchaseData = purchaseDoc.data()

      console.log("✅ [Recent Purchase] Found in bundlePurchases:", purchaseDoc.id)

      return NextResponse.json({
        success: true,
        purchase: {
          id: purchaseDoc.id,
          bundleId: purchaseData.bundleId,
          bundleTitle: purchaseData.bundleTitle || "Untitled Bundle",
          description: purchaseData.description || "",
          thumbnailUrl: purchaseData.thumbnailUrl || "",
          creatorName: purchaseData.creatorName || "",
          creatorUsername: purchaseData.creatorUsername || "",
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          contentCount: purchaseData.contentCount || 0,
          totalSize: purchaseData.totalSize || 0,
          buyerUid: purchaseData.buyerUid,
          itemNames: purchaseData.itemNames || [],
          contents: purchaseData.contents || [],
        },
      })
    }

    // Check recent checkout attempts
    if (searchResults[1] && !searchResults[1].empty) {
      const recentAttempts = searchResults[1].docs

      // Look for a recent attempt that might be completed but not processed
      for (const attemptDoc of recentAttempts) {
        const attemptData = attemptDoc.data()
        const timeDiff = Date.now() - attemptData.createdAt.toDate().getTime()

        // If attempt is within last 10 minutes, try to complete it
        if (timeDiff < 10 * 60 * 1000) {
          console.log("🔄 [Recent Purchase] Found recent checkout attempt:", attemptDoc.id)

          try {
            // Try to complete this purchase
            const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/complete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sessionId: attemptDoc.id,
                buyerUid: attemptData.buyerUid,
                productBoxId: attemptData.productBoxId,
                amount: attemptData.amount,
                currency: attemptData.currency,
                forceComplete: true,
              }),
            })

            if (completionResponse.ok) {
              const completionResult = await completionResponse.json()
              if (completionResult.success) {
                console.log("✅ [Recent Purchase] Completed recent attempt")
                return NextResponse.json({
                  success: true,
                  purchase: completionResult.purchase,
                })
              }
            }
          } catch (error) {
            console.warn("⚠️ [Recent Purchase] Failed to complete recent attempt:", error)
          }
        }
      }
    }

    // Check regular purchases collection
    if (searchResults[2] && !searchResults[2].empty) {
      const purchaseDoc = searchResults[2].docs[0]
      const purchaseData = purchaseDoc.data()

      console.log("✅ [Recent Purchase] Found in purchases collection:", purchaseDoc.id)

      // Try to enhance with bundle data
      let bundleData = null
      try {
        const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
        if (bundleDoc.exists()) {
          bundleData = bundleDoc.data()
        } else {
          const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
          if (productBoxDoc.exists()) {
            bundleData = productBoxDoc.data()
          }
        }
      } catch (error) {
        console.warn("⚠️ [Recent Purchase] Failed to get bundle data:", error)
      }

      return NextResponse.json({
        success: true,
        purchase: {
          id: purchaseDoc.id,
          bundleId: productBoxId,
          bundleTitle: bundleData?.title || purchaseData.itemTitle || "Untitled Bundle",
          description: bundleData?.description || purchaseData.itemDescription || "",
          thumbnailUrl: bundleData?.thumbnailUrl || purchaseData.thumbnailUrl || "",
          creatorName: purchaseData.creatorName || "",
          creatorUsername: purchaseData.creatorUsername || "",
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          contentCount: 0, // Will be populated by content lookup
          totalSize: 0,
          buyerUid: purchaseData.buyerUid || purchaseData.userId,
          itemNames: [],
          contents: [],
        },
      })
    }

    console.log("❌ [Recent Purchase] No recent purchase found")
    return NextResponse.json({ error: "No recent purchase found for this product" }, { status: 404 })
  } catch (error) {
    console.error("❌ [Recent Purchase] Error:", error)
    return NextResponse.json({ error: "Failed to verify recent purchase" }, { status: 500 })
  }
}
