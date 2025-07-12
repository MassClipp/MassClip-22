import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Anonymous Purchases API] Fetching anonymous purchases...`)

    // Get access tokens from cookies
    const cookies = request.cookies
    const accessTokens: string[] = []

    // Look for purchase access tokens in cookies
    cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("purchase_access_")) {
        accessTokens.push(cookie.value)
      }
    })

    if (accessTokens.length === 0) {
      console.log(`ℹ️ [Anonymous Purchases API] No access tokens found in cookies`)
      return NextResponse.json({
        purchases: [],
        totalCount: 0,
        message: "No anonymous purchases found",
      })
    }

    console.log(`🔍 [Anonymous Purchases API] Found ${accessTokens.length} access tokens`)

    const allPurchases: any[] = []

    // Helper function to get bundle details including thumbnail
    const getBundleDetails = async (bundleId: string) => {
      try {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          const bundleData = bundleDoc.data()
          return {
            title: bundleData?.title || "Untitled Bundle",
            thumbnail: bundleData?.customPreviewThumbnail || bundleData?.thumbnailUrl,
            description: bundleData?.description,
            creatorId: bundleData?.creatorId,
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Anonymous Purchases] Could not fetch bundle ${bundleId}:`, error)
      }
      return null
    }

    // Helper function to get creator details
    const getCreatorDetails = async (creatorId: string) => {
      try {
        const creatorDoc = await db.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          return {
            username: creatorData?.username || "Unknown",
            displayName: creatorData?.displayName,
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Anonymous Purchases] Could not fetch creator ${creatorId}:`, error)
      }
      return { username: "Unknown" }
    }

    // Search for purchases with these access tokens
    for (const token of accessTokens) {
      try {
        // Check anonymousPurchases collection
        const anonymousQuery = db.collection("anonymousPurchases").where("accessToken", "==", token)
        const anonymousSnapshot = await anonymousQuery.get()

        for (const doc of anonymousSnapshot.docs) {
          const data = doc.data()
          const bundleId = data.productBoxId || data.bundleId

          // Get bundle details including thumbnail
          const bundleDetails = await getBundleDetails(bundleId)
          const creatorDetails = await getCreatorDetails(data.creatorId)

          allPurchases.push({
            id: doc.id,
            productBoxId: bundleId,
            productBoxTitle: bundleDetails?.title || data.productBoxTitle || "Untitled Bundle",
            productBoxDescription: bundleDetails?.description || data.productBoxDescription || "Premium content bundle",
            productBoxThumbnail: bundleDetails?.thumbnail || data.productBoxThumbnail,
            creatorUsername: creatorDetails.username,
            creatorName: creatorDetails.displayName || creatorDetails.username,
            creatorId: data.creatorId,
            purchasedAt: data.purchasedAt || data.createdAt,
            amount: data.amount || 0,
            currency: data.currency || "usd",
            status: "completed",
            source: "anonymous",
            anonymousAccess: true,
            items: data.items || [],
            totalItems: data.totalItems || 0,
            totalSize: data.totalSize || 0,
            accessToken: token,
          })
        }

        // Also check regular purchase collections with access tokens
        const purchaseQuery = db.collection("bundlePurchases").where("accessToken", "==", token)
        const purchaseSnapshot = await purchaseQuery.get()

        for (const doc of purchaseSnapshot.docs) {
          const data = doc.data()
          const bundleId = data.bundleId || data.productBoxId

          // Check if we already have this purchase
          const existingPurchase = allPurchases.find((p) => p.productBoxId === bundleId)
          if (!existingPurchase) {
            // Get bundle details including thumbnail
            const bundleDetails = await getBundleDetails(bundleId)
            const creatorDetails = await getCreatorDetails(data.creatorId)

            allPurchases.push({
              id: doc.id,
              productBoxId: bundleId,
              productBoxTitle: bundleDetails?.title || data.bundleTitle || "Untitled Bundle",
              productBoxDescription: bundleDetails?.description || data.description || "Premium content bundle",
              productBoxThumbnail: bundleDetails?.thumbnail || data.thumbnailUrl,
              creatorUsername: creatorDetails.username,
              creatorName: creatorDetails.displayName || creatorDetails.username,
              creatorId: data.creatorId,
              purchasedAt: data.createdAt || data.completedAt,
              amount: data.amount || 0,
              currency: data.currency || "usd",
              status: data.status || "completed",
              source: "bundlePurchases",
              anonymousAccess: true,
              contents: data.contents || [],
              items: data.contents || [],
              contentCount: data.contentCount || 0,
              totalItems: data.contentCount || 0,
              totalSize: data.totalSize || 0,
              accessToken: token,
            })
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Anonymous Purchases] Error checking token ${token}:`, error)
      }
    }

    // Sort by purchase date (newest first)
    allPurchases.sort((a, b) => {
      const dateA = new Date(a.purchasedAt || 0).getTime()
      const dateB = new Date(b.purchasedAt || 0).getTime()
      return dateB - dateA
    })

    console.log(`✅ [Anonymous Purchases API] Found ${allPurchases.length} anonymous purchases`)

    return NextResponse.json({
      purchases: allPurchases,
      totalCount: allPurchases.length,
      accessTokensChecked: accessTokens.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ [Anonymous Purchases API] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch anonymous purchases",
        details: error.message,
        purchases: [],
      },
      { status: 500 },
    )
  }
}
