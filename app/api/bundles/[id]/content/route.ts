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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // First, verify the user has purchased this bundle
    const bundlePurchasesRef = db.collection("bundlePurchases")
    const purchaseQuery = await bundlePurchasesRef
      .where("userId", "==", userId)
      .where("bundleId", "==", bundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (purchaseQuery.empty) {
      return NextResponse.json({ error: "Access denied. Bundle not purchased." }, { status: 403 })
    }

    const purchaseDoc = purchaseQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    // Get bundle info from the purchase data or bundles collection
    let bundleInfo = {
      id: bundleId,
      title: purchaseData.title || purchaseData.bundleTitle || "Unknown Bundle",
      description: purchaseData.description || purchaseData.bundleDescription || "",
      creatorId: purchaseData.creatorId || "",
      creatorUsername: purchaseData.creatorUsername || "Unknown Creator",
      thumbnailUrl: purchaseData.thumbnailUrl || purchaseData.bundleThumbnailUrl || "",
      price: purchaseData.price || 0,
      currency: purchaseData.currency || "usd",
    }

    // Try to get additional bundle info from bundles collection if available
    try {
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (bundleDoc.exists) {
        const bundleData = bundleDoc.data()
        bundleInfo = {
          ...bundleInfo,
          title: bundleData?.title || bundleInfo.title,
          description: bundleData?.description || bundleInfo.description,
          thumbnailUrl: bundleData?.thumbnailUrl || bundleInfo.thumbnailUrl,
        }
      }
    } catch (error) {
      console.log("Could not fetch bundle info from bundles collection:", error)
    }

    // Extract content from purchase data
    let contents: any[] = []

    // Try different possible field names for content
    const possibleContentFields = [
      "contents",
      "items",
      "bundleContents",
      "contentItems",
      "content",
      "bundleItems",
      "videos",
      "files",
    ]

    for (const field of possibleContentFields) {
      if (purchaseData[field] && Array.isArray(purchaseData[field])) {
        contents = purchaseData[field]
        break
      }
    }

    // If no content found in arrays, check if content is stored as individual fields
    if (contents.length === 0) {
      // Look for content in nested objects
      if (purchaseData.metadata?.contents) {
        contents = purchaseData.metadata.contents
      } else if (purchaseData.bundleData?.contents) {
        contents = purchaseData.bundleData.contents
      }
    }

    // Normalize content items
    const normalizedContents = contents.map((item: any, index: number) => ({
      id: item.id || item.contentId || item.videoId || `content-${index}`,
      title: item.title || item.name || `Content ${index + 1}`,
      description: item.description || "",
      type: item.type || "video",
      fileType: item.fileType || item.mimeType || "video/mp4",
      size: item.size || item.fileSize || 0,
      duration: item.duration || 0,
      thumbnailUrl: item.thumbnailUrl || item.thumbnail || "",
      downloadUrl: item.downloadUrl || item.url || item.fileUrl || "",
      createdAt: item.createdAt || new Date().toISOString(),
      metadata: item.metadata || {},
    }))

    const response = {
      bundle: bundleInfo,
      contents: normalizedContents,
      purchaseInfo: {
        purchaseId: purchaseDoc.id,
        purchaseDate: purchaseData.createdAt || new Date().toISOString(),
        status: purchaseData.status || "completed",
      },
      debug: {
        purchaseDataKeys: Object.keys(purchaseData),
        foundContentField: possibleContentFields.find((field) => purchaseData[field]),
        contentCount: normalizedContents.length,
        rawPurchaseData: purchaseData, // Include for debugging
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching bundle content:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
