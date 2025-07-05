import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 [Unified Purchases API] Starting request...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Unified Purchases API] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log("🔑 [Unified Purchases API] Got token, verifying...")

    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid
    console.log(`👤 [Unified Purchases API] Verified user: ${userId}`)

    // Search multiple collections for purchases
    const purchaseCollections = ["userPurchases", "purchases", "productBoxPurchases", "bundlePurchases"]

    const allPurchases: any[] = []

    for (const collectionName of purchaseCollections) {
      try {
        console.log(`🔍 [Unified Purchases API] Searching ${collectionName}...`)

        const purchasesRef = db.collection(collectionName)
        const userPurchasesQuery = purchasesRef.where("userId", "==", userId)
        const snapshot = await userPurchasesQuery.get()

        console.log(`📊 [Unified Purchases API] Found ${snapshot.size} purchases in ${collectionName}`)

        for (const doc of snapshot.docs) {
          const purchaseData = doc.data()

          // Enhanced purchase object with metadata
          const purchase = {
            id: doc.id,
            ...purchaseData,
            collectionSource: collectionName,
            // Ensure we have proper timestamps
            createdAt: purchaseData.createdAt?.toDate?.() || purchaseData.createdAt || new Date(),
            updatedAt: purchaseData.updatedAt?.toDate?.() || purchaseData.updatedAt || new Date(),
            purchasedAt:
              purchaseData.purchasedAt?.toDate?.() ||
              purchaseData.purchasedAt ||
              purchaseData.createdAt?.toDate?.() ||
              new Date(),
          }

          // Fetch additional metadata based on purchase type
          if (purchase.productBoxId) {
            try {
              const productBoxDoc = await db.collection("productBoxes").doc(purchase.productBoxId).get()
              if (productBoxDoc.exists) {
                const productBoxData = productBoxDoc.data()
                purchase.metadata = {
                  ...purchase.metadata,
                  title: productBoxData?.title || purchase.title,
                  description: productBoxData?.description || purchase.description,
                  thumbnailUrl: productBoxData?.thumbnailUrl || purchase.thumbnailUrl,
                  contentCount: productBoxData?.contentCount || 0,
                  contentType: "video",
                }

                // Get creator info
                if (productBoxData?.creatorId) {
                  try {
                    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
                    if (creatorDoc.exists) {
                      const creatorData = creatorDoc.data()
                      purchase.creatorUsername = creatorData?.username || creatorData?.displayName || "Unknown Creator"
                    }
                  } catch (creatorError) {
                    console.log(
                      `⚠️ [Unified Purchases API] Could not fetch creator for ${purchase.productBoxId}:`,
                      creatorError,
                    )
                  }
                }
              }
            } catch (productBoxError) {
              console.log(
                `⚠️ [Unified Purchases API] Could not fetch product box ${purchase.productBoxId}:`,
                productBoxError,
              )
            }
          }

          if (purchase.bundleId) {
            try {
              const bundleDoc = await db.collection("bundles").doc(purchase.bundleId).get()
              if (bundleDoc.exists) {
                const bundleData = bundleDoc.data()
                purchase.metadata = {
                  ...purchase.metadata,
                  title: bundleData?.title || purchase.title,
                  description: bundleData?.description || purchase.description,
                  thumbnailUrl: bundleData?.thumbnailUrl || purchase.thumbnailUrl,
                  contentCount: bundleData?.contentCount || bundleData?.productBoxIds?.length || 0,
                  contentType: "bundle",
                }
                purchase.type = "bundle"
              }
            } catch (bundleError) {
              console.log(`⚠️ [Unified Purchases API] Could not fetch bundle ${purchase.bundleId}:`, bundleError)
            }
          }

          allPurchases.push(purchase)
        }
      } catch (collectionError) {
        console.log(`⚠️ [Unified Purchases API] Error searching ${collectionName}:`, collectionError)
        // Continue with other collections even if one fails
      }
    }

    // Remove duplicates based on productBoxId or bundleId
    const uniquePurchases = allPurchases.reduce((acc, current) => {
      const key = current.productBoxId || current.bundleId || current.id
      const existing = acc.find(
        (item: any) =>
          (item.productBoxId && item.productBoxId === current.productBoxId) ||
          (item.bundleId && item.bundleId === current.bundleId) ||
          item.id === current.id,
      )

      if (!existing) {
        acc.push(current)
      } else {
        // Keep the one with more complete data
        if (Object.keys(current).length > Object.keys(existing).length) {
          const index = acc.indexOf(existing)
          acc[index] = current
        }
      }

      return acc
    }, [])

    // Sort by purchase date (newest first)
    uniquePurchases.sort((a, b) => {
      const dateA = new Date(a.purchasedAt || a.createdAt)
      const dateB = new Date(b.purchasedAt || b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ [Unified Purchases API] Returning ${uniquePurchases.length} unique purchases`)

    return NextResponse.json({
      success: true,
      purchases: uniquePurchases,
      totalCount: uniquePurchases.length,
      searchedCollections: purchaseCollections,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
