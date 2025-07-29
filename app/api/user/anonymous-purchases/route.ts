import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Anonymous Purchases] Fetching anonymous purchases...")

    // Get session ID from cookies or headers
    const sessionId =
      request.cookies.get("session_id")?.value ||
      request.headers.get("x-session-id") ||
      request.nextUrl.searchParams.get("session_id")

    console.log("🍪 [Anonymous Purchases] Session ID:", sessionId ? sessionId.substring(0, 8) + "..." : "None")

    const purchases: any[] = []

    // Strategy 1: If we have a session ID, look for purchases with that session ID
    if (sessionId) {
      console.log("🔍 [Anonymous Purchases] Looking for purchases with session ID...")

      const sessionPurchasesQuery = await db
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .orderBy("createdAt", "desc")
        .get()

      console.log(`📦 [Anonymous Purchases] Found ${sessionPurchasesQuery.size} purchases for session`)

      for (const doc of sessionPurchasesQuery.docs) {
        const purchaseData = doc.data()
        console.log("📦 [Anonymous Purchases] Processing purchase:", doc.id)

        // Enrich with bundle data if it's a bundle purchase
        if (purchaseData.bundleId) {
          console.log("🔍 [Anonymous Purchases] Fetching bundle data for:", purchaseData.bundleId)

          try {
            const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
            if (bundleDoc.exists) {
              const bundleData = bundleDoc.data()!
              console.log("✅ [Anonymous Purchases] Bundle data found:", bundleData.title)

              // Create enriched purchase object
              const enrichedPurchase = {
                id: doc.id,
                productBoxId: purchaseData.bundleId, // Use bundleId as productBoxId for compatibility
                bundleId: purchaseData.bundleId,
                itemId: purchaseData.bundleId,
                productBoxTitle: bundleData.title || "Untitled Bundle",
                productBoxDescription: bundleData.description || "",
                productBoxThumbnail: bundleData.thumbnailUrl || "",
                creatorId: purchaseData.creatorId || bundleData.creatorId || "",
                creatorName: purchaseData.creatorName || "Unknown Creator",
                creatorUsername: purchaseData.creatorUsername || "",
                amount: purchaseData.amount || 0,
                currency: purchaseData.currency || "usd",
                purchasedAt: purchaseData.createdAt || purchaseData.purchasedAt || new Date(),
                status: purchaseData.status || "completed",
                source: "anonymous_session",
                anonymousAccess: true,

                // Bundle-specific data
                bundleData: {
                  id: bundleData.id || purchaseData.bundleId,
                  title: bundleData.title || "Untitled Bundle",
                  description: bundleData.description || "",
                  thumbnailUrl: bundleData.thumbnailUrl || "",
                  fileSize: bundleData.fileSize || 0,
                  duration: bundleData.duration || null,
                  fileType: bundleData.fileType || "unknown",
                  downloadCount: bundleData.downloadCount || 0,
                  creatorId: bundleData.creatorId || "",
                  createdAt: bundleData.createdAt || new Date(),
                  downloadUrl: bundleData.downloadUrl || "",
                },

                // Create items array from bundle data
                items: bundleData.downloadUrl
                  ? [
                      {
                        id: bundleData.id || purchaseData.bundleId,
                        title: bundleData.title || "Untitled Bundle",
                        fileUrl: bundleData.downloadUrl,
                        thumbnailUrl: bundleData.thumbnailUrl || "",
                        fileSize: bundleData.fileSize || 0,
                        duration: bundleData.duration || null,
                        contentType: getContentTypeFromFileType(bundleData.fileType || ""),
                      },
                    ]
                  : [],

                totalItems: 1,
                totalSize: bundleData.fileSize || 0,
              }

              purchases.push(enrichedPurchase)
            } else {
              console.warn("⚠️ [Anonymous Purchases] Bundle not found:", purchaseData.bundleId)

              // Create minimal purchase object even if bundle data is missing
              purchases.push({
                id: doc.id,
                productBoxId: purchaseData.bundleId,
                bundleId: purchaseData.bundleId,
                itemId: purchaseData.bundleId,
                productBoxTitle: purchaseData.itemTitle || "Bundle",
                productBoxDescription: purchaseData.itemDescription || "",
                productBoxThumbnail: purchaseData.thumbnailUrl || "",
                creatorId: purchaseData.creatorId || "",
                creatorName: purchaseData.creatorName || "Unknown Creator",
                creatorUsername: purchaseData.creatorUsername || "",
                amount: purchaseData.amount || 0,
                currency: purchaseData.currency || "usd",
                purchasedAt: purchaseData.createdAt || new Date(),
                status: purchaseData.status || "completed",
                source: "anonymous_session",
                anonymousAccess: true,
                items: [],
                totalItems: 0,
                totalSize: 0,
              })
            }
          } catch (bundleError) {
            console.error("❌ [Anonymous Purchases] Error fetching bundle data:", bundleError)
          }
        } else {
          // Handle non-bundle purchases (product boxes, etc.)
          purchases.push({
            id: doc.id,
            productBoxId: purchaseData.productBoxId || purchaseData.itemId,
            bundleId: purchaseData.bundleId,
            itemId: purchaseData.itemId,
            productBoxTitle: purchaseData.itemTitle || "Purchase",
            productBoxDescription: purchaseData.itemDescription || "",
            productBoxThumbnail: purchaseData.thumbnailUrl || "",
            creatorId: purchaseData.creatorId || "",
            creatorName: purchaseData.creatorName || "Unknown Creator",
            creatorUsername: purchaseData.creatorUsername || "",
            amount: purchaseData.amount || 0,
            currency: purchaseData.currency || "usd",
            purchasedAt: purchaseData.createdAt || new Date(),
            status: purchaseData.status || "completed",
            source: "anonymous_session",
            anonymousAccess: true,
            items: [],
            totalItems: 0,
            totalSize: 0,
          })
        }
      }
    }

    // Strategy 2: Look for recent anonymous purchases (fallback)
    if (purchases.length === 0) {
      console.log(
        "🔍 [Anonymous Purchases] No session-specific purchases found, looking for recent anonymous purchases...",
      )

      const recentPurchasesQuery = await db
        .collection("purchases")
        .where("userId", "==", "anonymous")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get()

      console.log(`📦 [Anonymous Purchases] Found ${recentPurchasesQuery.size} recent anonymous purchases`)

      // Process recent anonymous purchases the same way
      for (const doc of recentPurchasesQuery.docs) {
        const purchaseData = doc.data()

        if (purchaseData.bundleId) {
          try {
            const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
            if (bundleDoc.exists) {
              const bundleData = bundleDoc.data()!

              purchases.push({
                id: doc.id,
                productBoxId: purchaseData.bundleId,
                bundleId: purchaseData.bundleId,
                itemId: purchaseData.bundleId,
                productBoxTitle: bundleData.title || "Untitled Bundle",
                productBoxDescription: bundleData.description || "",
                productBoxThumbnail: bundleData.thumbnailUrl || "",
                creatorId: purchaseData.creatorId || bundleData.creatorId || "",
                creatorName: purchaseData.creatorName || "Unknown Creator",
                creatorUsername: purchaseData.creatorUsername || "",
                amount: purchaseData.amount || 0,
                currency: purchaseData.currency || "usd",
                purchasedAt: purchaseData.createdAt || new Date(),
                status: purchaseData.status || "completed",
                source: "anonymous_recent",
                anonymousAccess: true,
                bundleData: {
                  id: bundleData.id || purchaseData.bundleId,
                  title: bundleData.title || "Untitled Bundle",
                  description: bundleData.description || "",
                  thumbnailUrl: bundleData.thumbnailUrl || "",
                  fileSize: bundleData.fileSize || 0,
                  duration: bundleData.duration || null,
                  fileType: bundleData.fileType || "unknown",
                  downloadCount: bundleData.downloadCount || 0,
                  creatorId: bundleData.creatorId || "",
                  createdAt: bundleData.createdAt || new Date(),
                  downloadUrl: bundleData.downloadUrl || "",
                },
                items: bundleData.downloadUrl
                  ? [
                      {
                        id: bundleData.id || purchaseData.bundleId,
                        title: bundleData.title || "Untitled Bundle",
                        fileUrl: bundleData.downloadUrl,
                        thumbnailUrl: bundleData.thumbnailUrl || "",
                        fileSize: bundleData.fileSize || 0,
                        duration: bundleData.duration || null,
                        contentType: getContentTypeFromFileType(bundleData.fileType || ""),
                      },
                    ]
                  : [],
                totalItems: 1,
                totalSize: bundleData.fileSize || 0,
              })
            }
          } catch (bundleError) {
            console.error("❌ [Anonymous Purchases] Error fetching bundle data for recent purchase:", bundleError)
          }
        }
      }
    }

    console.log(`✅ [Anonymous Purchases] Returning ${purchases.length} purchases`)

    return NextResponse.json({
      success: true,
      purchases,
      count: purchases.length,
      sessionId: sessionId ? sessionId.substring(0, 8) + "..." : null,
    })
  } catch (error: any) {
    console.error("❌ [Anonymous Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch anonymous purchases",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function getContentTypeFromFileType(fileType: string): "video" | "audio" | "image" | "document" {
  if (!fileType) return "document"

  const type = fileType.toLowerCase()
  if (type.includes("video") || type.includes("mp4") || type.includes("mov") || type.includes("avi")) {
    return "video"
  } else if (type.includes("audio") || type.includes("mp3") || type.includes("wav")) {
    return "audio"
  } else if (type.includes("image") || type.includes("jpg") || type.includes("png") || type.includes("gif")) {
    return "image"
  }
  return "document"
}
