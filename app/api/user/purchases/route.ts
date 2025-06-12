import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")

    let authenticatedUserId: string | null = null

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

    // Use provided userId or authenticated userId
    const finalUserId = userId || authenticatedUserId

    if (!finalUserId) {
      console.error("❌ [Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Purchases API] Fetching purchases for user:", finalUserId)

    // Check multiple possible locations for purchases
    const purchaseLocations = [
      // Location 1: users/{userId}/purchases subcollection
      {
        name: "users subcollection",
        query: () => db.collection("users").doc(finalUserId).collection("purchases").get(),
      },
      // Location 2: purchases collection with userId field
      {
        name: "purchases collection with userId",
        query: () => db.collection("purchases").where("userId", "==", finalUserId).get(),
      },
      // Location 3: purchases collection with buyerUid field
      {
        name: "purchases collection with buyerUid",
        query: () => db.collection("purchases").where("buyerUid", "==", finalUserId).get(),
      },
    ]

    let purchasesSnapshot
    let foundLocation = null

    // Try each location until we find purchases
    for (const location of purchaseLocations) {
      try {
        console.log(`🔍 [Purchases API] Checking ${location.name}...`)
        const snapshot = await location.query()
        if (!snapshot.empty) {
          purchasesSnapshot = snapshot
          foundLocation = location.name
          console.log(`✅ [Purchases API] Found ${snapshot.size} purchases in ${location.name}`)
          break
        } else {
          console.log(`📭 [Purchases API] No purchases found in ${location.name}`)
        }
      } catch (error) {
        console.warn(`⚠️ [Purchases API] Error checking ${location.name}:`, error)
      }
    }

    if (!purchasesSnapshot || purchasesSnapshot.empty) {
      console.log("📭 [Purchases API] No purchases found in any location")
      return NextResponse.json({ purchases: [] })
    }

    console.log(`📊 [Purchases API] Found ${purchasesSnapshot.size} purchases in ${foundLocation}`)

    // Process purchases and fetch related data
    const purchases = []
    const productBoxIds = new Set<string>()
    const creatorIds = new Set<string>()

    // First pass: collect all IDs and convert to array for sorting
    const purchaseDocs = purchasesSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }))

    // Sort by timestamp/createdAt
    purchaseDocs.sort((a, b) => {
      const aTime = a.data.timestamp?.toDate?.() || a.data.createdAt?.toDate?.() || new Date(0)
      const bTime = b.data.timestamp?.toDate?.() || b.data.createdAt?.toDate?.() || new Date(0)
      return bTime.getTime() - aTime.getTime()
    })

    for (const doc of purchaseDocs) {
      const purchase = doc.data
      console.log("🔍 [Purchases API] Processing purchase:", doc.id, purchase)

      if (purchase.productBoxId) {
        productBoxIds.add(purchase.productBoxId)
      }
      if (purchase.creatorId) {
        creatorIds.add(purchase.creatorId)
      }
    }

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

    // Second pass: build purchase objects with related data
    for (const doc of purchaseDocs) {
      const purchase = doc.data
      const productBoxId = purchase.productBoxId
      const productBox = productBoxId ? productBoxesMap.get(productBoxId) : null

      // Determine creator ID from purchase or product box
      const creatorId = purchase.creatorId || (productBox ? productBox.creatorId : null)
      const creator = creatorId ? creatorsMap.get(creatorId) : null

      const purchaseData = {
        id: doc.id,
        type: "product_box",
        itemId: productBoxId,
        itemTitle: productBox ? productBox.title : "Unknown Product",
        itemDescription: productBox ? productBox.description : null,
        creatorId: creatorId,
        creatorName: creator ? creator.displayName || creator.username || "Unknown Creator" : "Unknown Creator",
        creatorUsername: creator ? creator.username : null,
        price: purchase.amount || 0,
        currency: purchase.currency || "usd",
        purchasedAt: purchase.timestamp?.toDate() || purchase.createdAt?.toDate() || new Date(),
        status: purchase.status || "completed",
        thumbnailUrl: productBox ? productBox.thumbnailUrl : null,
        customPreviewThumbnail: productBox ? productBox.customPreviewThumbnail : null,
        accessUrl: productBoxId ? `/product-box/${productBoxId}/content` : null,
        sessionId: purchase.sessionId,
      }

      purchases.push(purchaseData)
      console.log("✅ [Purchases API] Built purchase data:", purchaseData)
    }

    console.log("✅ [Purchases API] Returning", purchases.length, "purchases")
    return NextResponse.json({ purchases })
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
