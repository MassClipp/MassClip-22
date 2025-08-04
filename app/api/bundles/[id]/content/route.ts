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

const auth = getAuth()
const db = getFirestore()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const bundleId = params.id

    // First, verify the user has purchased this bundle
    const purchasesQuery = await db
      .collection("bundlePurchases")
      .where("userId", "==", userId)
      .where("bundleId", "==", bundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (purchasesQuery.empty) {
      return NextResponse.json({ error: "Bundle not purchased or access denied" }, { status: 403 })
    }

    const purchaseDoc = purchasesQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    console.log("Purchase data fields:", Object.keys(purchaseData))
    console.log("Purchase data:", JSON.stringify(purchaseData, null, 2))

    // Get bundle info from the purchase data
    const bundleInfo = {
      id: bundleId,
      title: purchaseData.title || purchaseData.bundleTitle || "Untitled Bundle",
      description: purchaseData.description || purchaseData.bundleDescription || "",
      creatorId: purchaseData.creatorId || "",
      creatorUsername: purchaseData.creatorUsername || "Unknown Creator",
      thumbnailUrl: purchaseData.thumbnailUrl || purchaseData.bundleThumbnailUrl || "",
      price: purchaseData.price || 0,
      currency: purchaseData.currency || "usd",
    }

    // Get content from the purchase data - try multiple possible field names
    let contents = []

    if (purchaseData.contents && Array.isArray(purchaseData.contents)) {
      contents = purchaseData.contents
    } else if (purchaseData.items && Array.isArray(purchaseData.items)) {
      contents = purchaseData.items
    } else if (purchaseData.bundleContents && Array.isArray(purchaseData.bundleContents)) {
      contents = purchaseData.bundleContents
    } else if (purchaseData.contentItems && Array.isArray(purchaseData.contentItems)) {
      contents = purchaseData.contentItems
    } else if (purchaseData.content && Array.isArray(purchaseData.content)) {
      contents = purchaseData.content
    }

    console.log("Found contents:", contents.length, "items")
    console.log("Contents preview:", contents.slice(0, 2))

    // Normalize content items
    const normalizedContents = contents.map((item: any, index: number) => ({
      id: item.id || item.contentId || item.uploadId || `item-${index}`,
      title: item.title || item.name || item.filename || `Content ${index + 1}`,
      description: item.description || "",
      type: item.type || item.contentType || "video",
      fileType: item.fileType || item.mimeType || "video/mp4",
      size: item.size || 0,
      duration: item.duration || 0,
      thumbnailUrl: item.thumbnailUrl || item.thumbnail || "",
      downloadUrl: item.downloadUrl || item.url || "",
      createdAt: item.createdAt || new Date().toISOString(),
      metadata: item.metadata || {},
    }))

    return NextResponse.json({
      bundle: bundleInfo,
      contents: normalizedContents,
      totalItems: normalizedContents.length,
      purchaseInfo: {
        purchaseId: purchaseDoc.id,
        purchaseDate: purchaseData.createdAt,
        status: purchaseData.status,
      },
    })
  } catch (error) {
    console.error("Error fetching bundle content:", error)
    return NextResponse.json({ error: "Failed to fetch bundle content" }, { status: 500 })
  }
}
