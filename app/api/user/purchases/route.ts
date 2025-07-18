import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

async function getParams(request: NextRequest): Promise<{ userId: string | null }> {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")
  return { userId }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getParams(request)

    let authenticatedUserId: string | null = null

    // Get auth token from header
    const authHeader = request.headers.get("authorization")

    // Verify auth token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
        console.log("✅ [Purchases API] Authenticated user:", authenticatedUserId)
      } catch (error) {
        console.error("❌ [Purchases API] Error verifying auth token:", error)
      }
    }

    // Use provided userId or authenticated UserId
    const finalUserId = userId || authenticatedUserId

    if (!finalUserId) {
      console.error("❌ [Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Purchases API] Fetching purchases for user: ${finalUserId}`)

    // Check ALL possible locations for purchases with more thorough queries
    const allPurchases = []

    // Location 1: Main purchases collection by document ID (sessionId)
    try {
      console.log("🔍 [Purchases API] Checking main purchases collection...")
      const mainPurchasesSnapshot = await db.collection("purchases").get()

      console.log(`📊 [Purchases API] Total documents in purchases collection: ${mainPurchasesSnapshot.size}`)

      mainPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        // Check if this purchase belongs to our user
        if (data.userId === finalUserId || data.buyerUid === finalUserId) {
          console.log(`✅ [Purchases API] Found purchase in main collection:`, doc.id, data)
          allPurchases.push({
            id: doc.id,
            source: "main_collection",
            ...data,
            purchasedAt:
              data.createdAt?.toDate?.() || data.timestamp?.toDate?.() || new Date(data.purchasedAt || Date.now()),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Purchases API] Error checking main purchases collection:", error)
    }

    // Location 2: userPurchases/{userId}/purchases (unified collection)
    try {
      console.log("🔍 [Purchases API] Checking userPurchases collection...")
      const unifiedPurchasesSnapshot = await db
        .collection("userPurchases")
        .doc(finalUserId)
        .collection("purchases")
        .get()

      console.log(`📊 [Purchases API] userPurchases found ${unifiedPurchasesSnapshot.size} items`)

      unifiedPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        // Avoid duplicates
        const existingPurchase = allPurchases.find((p) => p.sessionId === data.sessionId || p.id === doc.id)
        if (!existingPurchase) {
          console.log(`✅ [Purchases API] Found purchase in unified collection:`, doc.id, data)
          allPurchases.push({
            id: doc.id,
            source: "unified",
            ...data,
            purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt || Date.now()),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Purchases API] Error checking userPurchases:", error)
    }

    // Location 3: users/{userId}/purchases subcollection
    try {
      console.log("🔍 [Purchases API] Checking users subcollection...")
      const userPurchasesSnapshot = await db.collection("users").doc(finalUserId).collection("purchases").get()

      console.log(`📊 [Purchases API] users subcollection found ${userPurchasesSnapshot.size} items`)

      userPurchasesSnapshot.forEach((doc) => {
        const data = doc.data()
        // Avoid duplicates
        const existingPurchase = allPurchases.find((p) => p.sessionId === data.sessionId || p.id === doc.id)
        if (!existingPurchase) {
          console.log(`✅ [Purchases API] Found purchase in users subcollection:`, doc.id, data)
          allPurchases.push({
            id: doc.id,
            source: "legacy_user",
            ...data,
            purchasedAt:
              data.timestamp?.toDate?.() || data.createdAt?.toDate?.() || new Date(data.purchasedAt || Date.now()),
          })
        }
      })
    } catch (error) {
      console.warn("⚠️ [Purchases API] Error checking users subcollection:", error)
    }

    console.log(`📊 [Purchases API] Total unique purchases found: ${allPurchases.length}`)

    if (allPurchases.length === 0) {
      console.log("📭 [Purchases API] No purchases found in any location")

      // Additional debugging - check if user exists and has any data
      try {
        const userDoc = await db.collection("users").doc(finalUserId).get()
        if (userDoc.exists) {
          console.log("👤 [Purchases API] User document exists:", userDoc.data())
        } else {
          console.log("❌ [Purchases API] User document does not exist")
        }
      } catch (error) {
        console.warn("⚠️ [Purchases API] Error checking user document:", error)
      }

      return NextResponse.json({ purchases: [] })
    }

    // Now fetch related data for each purchase
    const productBoxIds = new Set()
    const creatorIds = new Set()

    allPurchases.forEach((purchase) => {
      if (purchase.productBoxId) {
        productBoxIds.add(purchase.productBoxId)
      }
      if (purchase.creatorId) {
        creatorIds.add(purchase.creatorId)
      }
    })

    console.log("🔍 [Purchases API] Product box IDs:", Array.from(productBoxIds))
    console.log("🔍 [Purchases API] Creator IDs:", Array.from(creatorIds))

    // Batch fetch product boxes
    const productBoxesMap = new Map()
    if (productBoxIds.size > 0) {
      const productBoxesPromises = Array.from(productBoxIds).map((id) => db.collection("productBoxes").doc(id).get())
      const productBoxDocs = await Promise.all(productBoxesPromises)

      productBoxDocs.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data()
          productBoxesMap.set(doc.id, data)
          console.log("📦 [Purchases API] Found product box:", doc.id, data?.title)

          // Also collect creator ID from product box if not already collected
          if (data?.creatorId) {
            creatorIds.add(data.creatorId)
          }
        }
      })
    }

    // Batch fetch creators
    const creatorsMap = new Map()
    if (creatorIds.size > 0) {
      const creatorsPromises = Array.from(creatorIds).map((id) => db.collection("users").doc(id).get())
      const creatorDocs = await Promise.all(creatorsPromises)

      creatorDocs.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data()
          creatorsMap.set(doc.id, data)
          console.log("👤 [Purchases API] Found creator:", doc.id, data?.displayName || data?.username)
        }
      })
    }

    // Process and normalize all purchases
    const normalizedPurchases = allPurchases.map((purchase) => {
      const productBoxId = purchase.productBoxId || purchase.itemId
      const productBox = productBoxId ? productBoxesMap.get(productBoxId) : null

      // Determine creator ID from purchase or product box
      const creatorId = purchase.creatorId || (productBox ? productBox.creatorId : null)
      const creator = creatorId ? creatorsMap.get(creatorId) : null

      return {
        id: purchase.id,
        type: "product_box",
        itemId: productBoxId,
        itemTitle: productBox ? productBox.title : purchase.itemTitle || purchase.productBoxTitle || "Unknown Product",
        itemDescription: productBox
          ? productBox.description
          : purchase.itemDescription || purchase.productBoxDescription || null,
        creatorId: creatorId,
        creatorName: creator
          ? creator.displayName || creator.username || "Unknown Creator"
          : purchase.creatorName || "Unknown Creator",
        creatorUsername: creator ? creator.username : purchase.creatorUsername || null,
        price: purchase.amount || 0,
        currency: purchase.currency || "usd",
        purchasedAt: purchase.purchasedAt,
        status: purchase.status || "completed",
        thumbnailUrl: productBox ? productBox.thumbnailUrl || productBox.customPreviewThumbnail : null,
        customPreviewThumbnail: productBox ? productBox.customPreviewThumbnail : null,
        accessUrl: productBoxId ? `/product-box/${productBoxId}/content` : null,
        sessionId: purchase.sessionId,
        source: purchase.source,
        // Include items if available (for unified purchases)
        items: purchase.items || [],
        totalItems: purchase.totalItems || (purchase.items ? purchase.items.length : 0),
      }
    })

    // Sort by purchase date (newest first)
    normalizedPurchases.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())

    console.log("✅ [Purchases API] Returning", normalizedPurchases.length, "normalized purchases")
    return NextResponse.json({ purchases: normalizedPurchases })
  } catch (error) {
    console.error("❌ [Purchases API] Error fetching user purchases:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
