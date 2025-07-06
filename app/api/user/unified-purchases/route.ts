import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases API] Starting request")

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Unified Purchases API] Missing or invalid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Unified Purchases API] User authenticated:", {
        userId: decodedToken.uid,
        email: decodedToken.email,
      })
    } catch (error) {
      console.error("❌ [Unified Purchases API] Error verifying ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Fetch all purchases for the user
    console.log("📋 [Unified Purchases API] Fetching purchases for user:", userId)
    const purchasesSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .orderBy("timestamp", "desc")
      .get()

    console.log("📊 [Unified Purchases API] Found purchases:", purchasesSnapshot.size)

    const purchases = []
    let totalSpent = 0
    let testPurchases = 0
    let livePurchases = 0

    for (const doc of purchasesSnapshot.docs) {
      try {
        const purchaseData = doc.data()
        console.log("🔍 [Unified Purchases API] Processing purchase:", {
          id: doc.id,
          productBoxId: purchaseData.productBoxId,
          amount: purchaseData.amount,
          stripeMode: purchaseData.stripeMode,
        })

        // Get product box details
        let productBoxData = null
        let creatorData = null

        if (purchaseData.productBoxId) {
          try {
            const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
            if (productBoxDoc.exists) {
              productBoxData = productBoxDoc.data()

              // Get creator details
              if (productBoxData?.creatorId) {
                const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
                if (creatorDoc.exists) {
                  creatorData = creatorDoc.data()
                }
              }
            }
          } catch (productError) {
            console.error("⚠️ [Unified Purchases API] Error fetching product box:", productError)
          }
        }

        const purchase = {
          id: doc.id,
          productBoxId: purchaseData.productBoxId,
          itemTitle: productBoxData?.title || "Product Box",
          itemDescription: productBoxData?.description,
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          purchasedAt: purchaseData.timestamp?.toDate() || new Date(),
          status: purchaseData.status || "completed",
          thumbnailUrl: productBoxData?.thumbnailUrl,
          creatorUsername: creatorData?.username,
          creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
          type: "product_box",
          stripeMode: purchaseData.stripeMode || "unknown",
          sessionId: purchaseData.sessionId,
        }

        purchases.push(purchase)

        // Update statistics
        totalSpent += purchase.amount
        if (purchase.stripeMode === "test") {
          testPurchases++
        } else if (purchase.stripeMode === "live") {
          livePurchases++
        }
      } catch (itemError) {
        console.error("⚠️ [Unified Purchases API] Error processing purchase item:", {
          purchaseId: doc.id,
          error: itemError,
        })
        // Continue processing other items
      }
    }

    const stats = {
      totalPurchases: purchases.length,
      totalSpent,
      currency: "usd",
      testPurchases,
      livePurchases,
    }

    console.log("✅ [Unified Purchases API] Response prepared:", {
      purchaseCount: purchases.length,
      stats,
    })

    return NextResponse.json({
      success: true,
      purchases,
      stats,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases API] Unexpected error:", {
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
