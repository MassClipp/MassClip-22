import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle Content] Fetching content for bundle: ${bundleId}`)

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ [Bundle Content] No valid session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`👤 [Bundle Content] User ID: ${userId}`)

    // First, get bundle info
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle Content] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`📦 [Bundle Content] Bundle found: ${bundleData.title}`)

    // Check if user has purchased this bundle - try multiple approaches
    console.log(`🔍 [Bundle Content] Checking purchase access for user ${userId}`)

    let hasAccess = false
    let purchaseInfo = null

    // Method 1: Check if user is the creator
    if (bundleData.creatorId === userId) {
      hasAccess = true
      console.log(`✅ [Bundle Content] User is the creator`)
    }

    // Method 2: Check bundlePurchases collection with bundleId as doc ID
    if (!hasAccess) {
      try {
        const bundlePurchaseDoc = await db.collection("bundlePurchases").doc(bundleId).get()
        if (bundlePurchaseDoc.exists) {
          const purchaseData = bundlePurchaseDoc.data()!
          console.log(`📄 [Bundle Content] Found purchase document:`, purchaseData)

          if (purchaseData.buyerUid === userId && purchaseData.status === "completed") {
            hasAccess = true
            purchaseInfo = {
              purchaseId: bundlePurchaseDoc.id,
              purchaseDate: purchaseData.createdAt,
              status: purchaseData.status,
            }
            console.log(`✅ [Bundle Content] User has access via bundlePurchases (doc ID)`)
          }
        }
      } catch (error) {
        console.log(`⚠️ [Bundle Content] Error checking bundlePurchases by doc ID:`, error)
      }
    }

    // Method 3: Query bundlePurchases collection
    if (!hasAccess) {
      try {
        const bundlePurchasesQuery = await db
          .collection("bundlePurchases")
          .where("buyerUid", "==", userId)
          .where("bundleId", "==", bundleId)
          .where("status", "==", "completed")
          .limit(1)
          .get()

        if (!bundlePurchasesQuery.empty) {
          const purchaseDoc = bundlePurchasesQuery.docs[0]
          const purchaseData = purchaseDoc.data()
          hasAccess = true
          purchaseInfo = {
            purchaseId: purchaseDoc.id,
            purchaseDate: purchaseData.createdAt,
            status: purchaseData.status,
          }
          console.log(`✅ [Bundle Content] User has access via bundlePurchases query`)
        }
      } catch (error) {
        console.log(`⚠️ [Bundle Content] Error querying bundlePurchases:`, error)
      }
    }

    // Method 4: Check purchases collection (alternative structure)
    if (!hasAccess) {
      try {
        const purchasesQuery = await db
          .collection("purchases")
          .where("userId", "==", userId)
          .where("bundleId", "==", bundleId)
          .where("status", "==", "completed")
          .limit(1)
          .get()

        if (!purchasesQuery.empty) {
          const purchaseDoc = purchasesQuery.docs[0]
          const purchaseData = purchaseDoc.data()
          hasAccess = true
          purchaseInfo = {
            purchaseId: purchaseDoc.id,
            purchaseDate: purchaseData.createdAt,
            status: purchaseData.status,
          }
          console.log(`✅ [Bundle Content] User has access via purchases collection`)
        }
      } catch (error) {
        console.log(`⚠️ [Bundle Content] Error checking purchases collection:`, error)
      }
    }

    if (!hasAccess) {
      console.log(`❌ [Bundle Content] User does not have access to bundle: ${bundleId}`)
      return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
    }

    // Get bundle contents
    console.log(`📁 [Bundle Content] Fetching bundle contents`)
    let contents: any[] = []

    try {
      // Try to get contents from subcollection first
      const contentsQuery = await db
        .collection("bundles")
        .doc(bundleId)
        .collection("content")
        .orderBy("createdAt", "desc")
        .get()

      contents = contentsQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(`📁 [Bundle Content] Found ${contents.length} items in subcollection`)
    } catch (error) {
      console.log(`⚠️ [Bundle Content] Error fetching from subcollection:`, error)
    }

    // If no contents in subcollection, try to get from bundle document
    if (contents.length === 0) {
      const possibleContentFields = ["content", "contents", "items", "videos", "files", "bundleContent"]

      for (const field of possibleContentFields) {
        if (bundleData[field] && Array.isArray(bundleData[field])) {
          contents = bundleData[field].map((item: any, index: number) => ({
            id: item.id || `content_${index}`,
            ...item,
          }))
          console.log(`📁 [Bundle Content] Found ${contents.length} items in field: ${field}`)
          break
        }
      }
    }

    // Get creator info
    let creatorUsername = "Unknown Creator"
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()!
          creatorUsername = creatorData.username || creatorData.displayName || "Unknown Creator"
        }
      } catch (error) {
        console.log(`⚠️ [Bundle Content] Error fetching creator info:`, error)
      }
    }

    const response = {
      bundle: {
        id: bundleId,
        title: bundleData.title || "Untitled Bundle",
        description: bundleData.description || "",
        creatorId: bundleData.creatorId || "",
        creatorUsername,
        thumbnailUrl: bundleData.thumbnailUrl || "",
        price: bundleData.price || 0,
        currency: bundleData.currency || "usd",
      },
      contents,
      purchaseInfo,
      hasAccess: true,
    }

    console.log(`✅ [Bundle Content] Returning response with ${contents.length} items`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundle Content] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
