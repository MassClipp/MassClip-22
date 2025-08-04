import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const bundleId = params.id

    console.log("Fetching bundle content for:", { bundleId, userId })

    // Check if user has purchased this bundle
    const purchaseQuery = await db
      .collection("bundlePurchases")
      .where("bundleId", "==", bundleId)
      .where("buyerId", "==", userId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (purchaseQuery.empty) {
      console.log("No purchase found for bundle:", bundleId, "user:", userId)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const purchaseDoc = purchaseQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    console.log("Purchase found:", purchaseData)

    // Get bundle info
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    console.log("Bundle data:", bundleData)

    // Get bundle contents - try multiple possible field names
    let contents: any[] = []

    // Check different possible field names for content
    const possibleContentFields = ["content", "contents", "items", "videos", "files", "bundleContent"]

    for (const field of possibleContentFields) {
      if (bundleData?.[field] && Array.isArray(bundleData[field])) {
        contents = bundleData[field]
        console.log(`Found content in field: ${field}`, contents)
        break
      }
    }

    // If no content found in bundle document, try to get from separate collection
    if (contents.length === 0) {
      console.log("No content in bundle document, checking bundleContent collection")
      const contentQuery = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

      contents = contentQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log("Content from bundleContent collection:", contents)
    }

    // Process contents to ensure proper video URLs
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

    console.log("Processed contents:", processedContents)

    // Get creator info
    let creatorUsername = "Unknown Creator"
    if (bundleData?.creatorId) {
      try {
        const creatorDoc = await db.collection("userProfiles").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorUsername = creatorData?.username || creatorData?.displayName || "Unknown Creator"
        }
      } catch (error) {
        console.error("Error fetching creator info:", error)
      }
    }

    const response = {
      bundle: {
        id: bundleId,
        title: bundleData?.title || bundleData?.name || "Untitled Bundle",
        description: bundleData?.description || "",
        creatorId: bundleData?.creatorId || "",
        creatorUsername,
        thumbnailUrl: bundleData?.thumbnailUrl || bundleData?.thumbnail || "",
        price: bundleData?.price || 0,
        currency: bundleData?.currency || "usd",
      },
      contents: processedContents,
      purchaseInfo: {
        purchaseId: purchaseDoc.id,
        purchaseDate: purchaseData.createdAt || new Date().toISOString(),
        status: purchaseData.status || "completed",
      },
    }

    console.log("Final response:", response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching bundle content:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
