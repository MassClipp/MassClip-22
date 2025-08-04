import { type NextRequest, NextResponse } from "next/server"
import { db, verifyIdToken } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle Content] Fetching content for bundle: ${bundleId}`)

    // Get Firebase token from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Bundle Content] No Bearer token in authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    let userId: string

    try {
      const decodedToken = await verifyIdToken(token)
      userId = decodedToken.uid
      console.log(`👤 [Bundle Content] Decoded Firebase token for user: ${userId}`)
    } catch (error) {
      console.log("❌ [Bundle Content] Invalid Firebase token:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // First, get bundle info
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle Content] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`📦 [Bundle Content] Bundle found: ${bundleData.title}`)

    // Check if user has purchased this bundle
    console.log(`🔍 [Bundle Content] Checking purchase access for user ${userId}`)

    let hasAccess = false
    let purchaseInfo = null
    let contents: any[] = []

    // Method 1: Check if user is the creator
    if (bundleData.creatorId === userId) {
      hasAccess = true
      console.log(`✅ [Bundle Content] User is the creator`)

      // For creators, get content from bundle document
      const possibleContentFields = ["content", "contents", "items", "videos", "files", "bundleContent"]
      for (const field of possibleContentFields) {
        if (bundleData[field] && Array.isArray(bundleData[field])) {
          contents = bundleData[field].map((item: any, index: number) => ({
            id: item.id || `content_${index}`,
            ...item,
          }))
          console.log(`📁 [Bundle Content] Found ${contents.length} items in bundle field: ${field}`)
          break
        }
      }
    }

    // Method 2: Check bundlePurchases collection - look for purchase document
    if (!hasAccess) {
      try {
        // Try different query patterns for bundlePurchases
        const purchaseQueries = [
          // Query by buyerUid and bundleId
          db
            .collection("bundlePurchases")
            .where("buyerUid", "==", userId)
            .where("bundleId", "==", bundleId)
            .where("status", "==", "completed"),

          // Query by userId and bundleId (alternative field name)
          db
            .collection("bundlePurchases")
            .where("userId", "==", userId)
            .where("bundleId", "==", bundleId)
            .where("status", "==", "completed"),

          // Query by buyerId and bundleId (another alternative)
          db
            .collection("bundlePurchases")
            .where("buyerId", "==", userId)
            .where("bundleId", "==", bundleId)
            .where("status", "==", "completed"),
        ]

        for (const query of purchaseQueries) {
          try {
            const querySnapshot = await query.limit(1).get()
            if (!querySnapshot.empty) {
              const purchaseDoc = querySnapshot.docs[0]
              const purchaseData = purchaseDoc.data()

              hasAccess = true
              purchaseInfo = {
                purchaseId: purchaseDoc.id,
                purchaseDate: purchaseData.createdAt,
                status: purchaseData.status,
              }

              // Get content directly from purchase document
              const possibleContentFields = [
                "content",
                "contents",
                "items",
                "videos",
                "files",
                "bundleContent",
                "purchasedContent",
              ]
              for (const field of possibleContentFields) {
                if (purchaseData[field] && Array.isArray(purchaseData[field])) {
                  contents = purchaseData[field].map((item: any, index: number) => ({
                    id: item.id || `content_${index}`,
                    ...item,
                  }))
                  console.log(`📁 [Bundle Content] Found ${contents.length} items in purchase field: ${field}`)
                  break
                }
              }

              // If no content in purchase doc, try to get from bundle doc
              if (contents.length === 0) {
                const possibleBundleFields = ["content", "contents", "items", "videos", "files", "bundleContent"]
                for (const field of possibleBundleFields) {
                  if (bundleData[field] && Array.isArray(bundleData[field])) {
                    contents = bundleData[field].map((item: any, index: number) => ({
                      id: item.id || `content_${index}`,
                      ...item,
                    }))
                    console.log(`📁 [Bundle Content] Found ${contents.length} items in bundle field: ${field}`)
                    break
                  }
                }
              }

              console.log(`✅ [Bundle Content] User has access via bundlePurchases`)
              break
            }
          } catch (queryError) {
            console.log(`⚠️ [Bundle Content] Query failed, trying next pattern:`, queryError)
            continue
          }
        }
      } catch (error) {
        console.log(`⚠️ [Bundle Content] Error checking bundlePurchases:`, error)
      }
    }

    // Method 3: Check purchases collection (alternative structure)
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

          // Get content from purchase document
          const possibleContentFields = [
            "content",
            "contents",
            "items",
            "videos",
            "files",
            "bundleContent",
            "purchasedContent",
          ]
          for (const field of possibleContentFields) {
            if (purchaseData[field] && Array.isArray(purchaseData[field])) {
              contents = purchaseData[field].map((item: any, index: number) => ({
                id: item.id || `content_${index}`,
                ...item,
              }))
              console.log(`📁 [Bundle Content] Found ${contents.length} items in purchases field: ${field}`)
              break
            }
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

    // Process contents to ensure proper structure
    const processedContents = contents.map((content: any) => ({
      id: content.id || content.contentId || `content_${Date.now()}_${Math.random()}`,
      title: content.title || content.name || "Untitled",
      description: content.description || "",
      type: content.type || "video",
      fileType: content.fileType || content.mimeType || "video/mp4",
      size: content.size || content.fileSize || 0,
      duration: content.duration || 0,
      thumbnailUrl: content.thumbnailUrl || content.thumbnail || "",
      downloadUrl: content.downloadUrl || content.fileUrl || content.url || "",
      videoUrl: content.videoUrl || content.downloadUrl || content.fileUrl || content.url || "",
      createdAt: content.createdAt || new Date().toISOString(),
      metadata: content.metadata || {},
    }))

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
      contents: processedContents,
      purchaseInfo,
      hasAccess: true,
    }

    console.log(`✅ [Bundle Content] Returning response with ${processedContents.length} items`)
    console.log(`📄 [Bundle Content] Sample content:`, processedContents[0])

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundle Content] Unexpected error:", error)
    console.error("❌ [Bundle Content] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
