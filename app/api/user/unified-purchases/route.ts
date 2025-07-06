import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify the ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("Error verifying ID token:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("📋 [Unified Purchases] Fetching purchases for user:", userId)

    const purchases: any[] = []

    try {
      // Fetch from user's purchases subcollection (new structure)
      const userPurchasesQuery = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .orderBy("timestamp", "desc")
        .get()

      console.log(`📦 [Unified Purchases] Found ${userPurchasesQuery.docs.length} user purchases`)

      for (const doc of userPurchasesQuery.docs) {
        const purchaseData = doc.data()

        // Get product box details if it's a product box purchase
        let itemDetails = {
          title: "Unknown Item",
          description: "",
          thumbnailUrl: "",
          creatorId: purchaseData.creatorId,
        }

        if (purchaseData.productBoxId) {
          try {
            const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
            if (productBoxDoc.exists) {
              const productBoxData = productBoxDoc.data()!
              itemDetails = {
                title: productBoxData.title || "Product Box",
                description: productBoxData.description || "",
                thumbnailUrl: productBoxData.thumbnailUrl || "",
                creatorId: productBoxData.creatorId || purchaseData.creatorId,
              }
            }
          } catch (error) {
            console.error("Error fetching product box details:", error)
          }
        }

        // Get creator details
        let creatorDetails = {
          username: "",
          name: "Unknown Creator",
        }

        if (itemDetails.creatorId) {
          try {
            const creatorDoc = await db.collection("users").doc(itemDetails.creatorId).get()
            if (creatorDoc.exists) {
              const creatorData = creatorDoc.data()!
              creatorDetails = {
                username: creatorData.username || "",
                name: creatorData.displayName || creatorData.name || "Unknown Creator",
              }
            }
          } catch (error) {
            console.error("Error fetching creator details:", error)
          }
        }

        purchases.push({
          id: doc.id,
          productBoxId: purchaseData.productBoxId,
          bundleId: purchaseData.bundleId,
          itemTitle: itemDetails.title,
          itemDescription: itemDetails.description,
          thumbnailUrl: itemDetails.thumbnailUrl,
          amount: purchaseData.amount || 0,
          currency: purchaseData.currency || "usd",
          purchasedAt: purchaseData.timestamp?.toDate() || new Date(),
          status: purchaseData.status || "completed",
          creatorUsername: creatorDetails.username,
          creatorName: creatorDetails.name,
          type: purchaseData.bundleId ? "bundle" : "product_box",
          sessionId: purchaseData.sessionId,
        })
      }

      // Also check legacy purchases collection for backward compatibility
      try {
        const legacyPurchasesQuery = await db
          .collection("purchases")
          .where("buyerUid", "==", userId)
          .orderBy("purchasedAt", "desc")
          .get()

        console.log(`📦 [Unified Purchases] Found ${legacyPurchasesQuery.docs.length} legacy purchases`)

        for (const doc of legacyPurchasesQuery.docs) {
          const purchaseData = doc.data()

          // Check if this purchase is already in the new structure
          const existingPurchase = purchases.find((p) => p.sessionId === purchaseData.sessionId)
          if (existingPurchase) {
            continue // Skip duplicates
          }

          // Get product box details
          let itemDetails = {
            title: "Unknown Item",
            description: "",
            thumbnailUrl: "",
            creatorId: purchaseData.creatorId,
          }

          if (purchaseData.productBoxId) {
            try {
              const productBoxDoc = await db.collection("productBoxes").doc(purchaseData.productBoxId).get()
              if (productBoxDoc.exists) {
                const productBoxData = productBoxDoc.data()!
                itemDetails = {
                  title: productBoxData.title || "Product Box",
                  description: productBoxData.description || "",
                  thumbnailUrl: productBoxData.thumbnailUrl || "",
                  creatorId: productBoxData.creatorId || purchaseData.creatorId,
                }
              }
            } catch (error) {
              console.error("Error fetching product box details:", error)
            }
          }

          // Get creator details
          let creatorDetails = {
            username: "",
            name: "Unknown Creator",
          }

          if (itemDetails.creatorId) {
            try {
              const creatorDoc = await db.collection("users").doc(itemDetails.creatorId).get()
              if (creatorDoc.exists) {
                const creatorData = creatorDoc.data()!
                creatorDetails = {
                  username: creatorData.username || "",
                  name: creatorData.displayName || creatorData.name || "Unknown Creator",
                }
              }
            } catch (error) {
              console.error("Error fetching creator details:", error)
            }
          }

          purchases.push({
            id: doc.id,
            productBoxId: purchaseData.productBoxId,
            bundleId: purchaseData.bundleId,
            itemTitle: itemDetails.title,
            itemDescription: itemDetails.description,
            thumbnailUrl: itemDetails.thumbnailUrl,
            amount: purchaseData.amount || 0,
            currency: purchaseData.currency || "usd",
            purchasedAt: purchaseData.purchasedAt?.toDate() || new Date(),
            status: purchaseData.status || "completed",
            creatorUsername: creatorDetails.username,
            creatorName: creatorDetails.name,
            type: purchaseData.bundleId ? "bundle" : "product_box",
            sessionId: purchaseData.sessionId,
          })
        }
      } catch (legacyError) {
        console.error("Error fetching legacy purchases:", legacyError)
        // Don't fail the entire request for legacy data
      }

      // Sort all purchases by date (newest first)
      purchases.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())

      console.log(`✅ [Unified Purchases] Returning ${purchases.length} total purchases`)

      return NextResponse.json({
        success: true,
        purchases,
        total: purchases.length,
        totalValue: purchases.reduce((sum, p) => sum + p.amount, 0),
      })
    } catch (firestoreError) {
      console.error("Error fetching purchases from Firestore:", firestoreError)
      return NextResponse.json(
        {
          error: "Failed to fetch purchases",
          details: "There was an error retrieving your purchase history",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Unexpected error in unified purchases:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
