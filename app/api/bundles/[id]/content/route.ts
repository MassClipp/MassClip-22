import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

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
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle Content API] Starting request for bundle: ${bundleId}`)

    // Get the authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Bundle Content API] No Bearer token in authorization header")
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      console.error("❌ [Bundle Content API] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid
    console.log(`👤 [Bundle Content API] User UID: ${userUid}`)
    console.log(`📦 [Bundle Content API] Bundle ID: ${bundleId}`)

    // PRIMARY LOGIC: Look ONLY in bundlePurchases collection
    // This is the ONLY place bundle content should be stored
    console.log(`🔍 [Bundle Content API] Searching bundlePurchases collection...`)

    let purchaseDoc = null
    let purchaseData = null

    // Method 1: Try document ID pattern (most common)
    const purchaseDocId = `${userUid}_${bundleId}`
    console.log(`🔍 [Bundle Content API] Trying document ID: ${purchaseDocId}`)

    try {
      const docRef = await db.collection("bundlePurchases").doc(purchaseDocId).get()
      if (docRef.exists) {
        purchaseDoc = docRef
        purchaseData = docRef.data()
        console.log(`✅ [Bundle Content API] Found purchase by document ID!`)
      }
    } catch (error) {
      console.log(`⚠️ [Bundle Content API] Error checking document ID:`, error)
    }

    // Method 2: Query by fields if document ID didn't work
    if (!purchaseDoc) {
      console.log(`🔍 [Bundle Content API] Document ID not found, trying field queries...`)

      const queryFields = ["buyerUid", "userId", "buyerId", "userUid"]

      for (const field of queryFields) {
        if (purchaseDoc) break

        console.log(`🔍 [Bundle Content API] Querying with ${field} = ${userUid} and bundleId = ${bundleId}`)

        try {
          const querySnapshot = await db
            .collection("bundlePurchases")
            .where(field, "==", userUid)
            .where("bundleId", "==", bundleId)
            .limit(1)
            .get()

          if (!querySnapshot.empty) {
            purchaseDoc = querySnapshot.docs[0]
            purchaseData = purchaseDoc.data()
            console.log(`✅ [Bundle Content API] Found purchase using field: ${field}`)
            break
          }
        } catch (error) {
          console.log(`⚠️ [Bundle Content API] Query failed for field ${field}:`, error)
        }
      }
    }

    // If no purchase found, user doesn't have access
    if (!purchaseDoc || !purchaseData) {
      console.log(`❌ [Bundle Content API] No purchase found for user ${userUid} and bundle ${bundleId}`)
      return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
    }

    console.log(`✅ [Bundle Content API] Purchase found! Document ID: ${purchaseDoc.id}`)
    console.log(`📄 [Bundle Content API] Full purchase data:`, JSON.stringify(purchaseData, null, 2))

    // Extract bundle info from purchase document
    const bundleInfo = {
      id: bundleId,
      title: purchaseData.bundleTitle || purchaseData.title || "Untitled Bundle",
      description: purchaseData.bundleDescription || purchaseData.description || "",
      creatorId: purchaseData.creatorId || purchaseData.creatorUid || "",
      creatorUsername: purchaseData.creatorUsername || purchaseData.creatorName || "Unknown Creator",
      thumbnailUrl: purchaseData.bundleThumbnailUrl || purchaseData.thumbnailUrl || "",
      price: purchaseData.price || purchaseData.amount || 0,
      currency: purchaseData.currency || "usd",
    }

    console.log(`📦 [Bundle Content API] Extracted bundle info:`, bundleInfo)

    // Extract content from purchase document - check ALL possible field names
    let bundleContents = []
    const possibleContentFields = [
      "content",
      "contents",
      "items",
      "videos",
      "files",
      "bundleContent",
      "bundleContents",
      "purchasedContent",
      "purchasedContents",
      "contentItems",
      "videoItems",
      "bundleItems",
    ]

    console.log(`🔍 [Bundle Content API] Checking for content in these fields:`, possibleContentFields)

    for (const field of possibleContentFields) {
      if (purchaseData[field] && Array.isArray(purchaseData[field])) {
        bundleContents = purchaseData[field]
        console.log(`✅ [Bundle Content API] Found ${bundleContents.length} content items in field: ${field}`)
        console.log(`📄 [Bundle Content API] Sample content item:`, JSON.stringify(bundleContents[0], null, 2))
        break
      } else if (purchaseData[field]) {
        console.log(`⚠️ [Bundle Content API] Field ${field} exists but is not an array:`, typeof purchaseData[field])
      }
    }

    if (bundleContents.length === 0) {
      console.log(`⚠️ [Bundle Content API] No content found in any field. Available fields:`, Object.keys(purchaseData))

      // Log all fields that contain arrays or objects for debugging
      Object.keys(purchaseData).forEach((key) => {
        const value = purchaseData[key]
        if (Array.isArray(value)) {
          console.log(`📄 [Bundle Content API] Array field "${key}":`, value.length, "items")
        } else if (typeof value === "object" && value !== null) {
          console.log(`📄 [Bundle Content API] Object field "${key}":`, Object.keys(value))
        }
      })
    }

    // Process content to ensure proper structure for 9:16 video display
    const processedContents = bundleContents.map((content, index) => {
      const processedContent = {
        id: content.id || content.contentId || content.videoId || `content_${index}`,
        title: content.title || content.name || content.filename || `Video ${index + 1}`,
        description: content.description || "",
        type: content.type || "video",
        fileType: content.fileType || content.mimeType || "video/mp4",
        size: content.size || content.fileSize || 0,
        duration: content.duration || 0,
        thumbnailUrl: content.thumbnailUrl || content.thumbnail || content.previewUrl || "",
        // Priority order for video URL: fileUrl > downloadUrl > videoUrl > url
        fileUrl: content.fileUrl || content.downloadUrl || content.videoUrl || content.url || "",
        downloadUrl: content.downloadUrl || content.fileUrl || content.url || "",
        videoUrl: content.videoUrl || content.fileUrl || content.downloadUrl || content.url || "",
        createdAt: content.createdAt || content.uploadedAt || new Date().toISOString(),
        metadata: content.metadata || {},
      }

      console.log(`📹 [Bundle Content API] Processed content ${index + 1}:`, {
        id: processedContent.id,
        title: processedContent.title,
        hasFileUrl: !!processedContent.fileUrl,
        hasThumbnail: !!processedContent.thumbnailUrl,
      })

      return processedContent
    })

    const response = {
      hasAccess: true,
      bundle: bundleInfo,
      contents: processedContents,
      purchaseInfo: {
        purchaseId: purchaseDoc.id,
        purchaseDate: purchaseData.createdAt || purchaseData.purchaseDate,
        status: purchaseData.status || "completed",
      },
    }

    console.log(`✅ [Bundle Content API] Returning response with ${processedContents.length} content items`)

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ [Bundle Content API] Unexpected error:", error)
    console.error("❌ [Bundle Content API] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
