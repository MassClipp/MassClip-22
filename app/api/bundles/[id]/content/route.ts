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

    console.log(`🔍 [Bundle Content API] Checking if user is bundle owner...`)

    let bundleDoc = null
    let bundleData = null
    let isOwner = false

    try {
      // Check in bundles collection first
      const bundleRef = await db.collection("bundles").doc(bundleId).get()
      if (bundleRef.exists) {
        bundleDoc = bundleRef
        bundleData = bundleRef.data()
        const creatorId = bundleData.creatorId || bundleData.creatorUid || bundleData.userId

        if (creatorId === userUid) {
          isOwner = true
          console.log(`✅ [Bundle Content API] User is bundle owner!`)
        }
      }
    } catch (error) {
      console.log(`⚠️ [Bundle Content API] Error checking bundle ownership:`, error)
    }

    // If user is the owner, get content from the bundle document
    if (isOwner && bundleData) {
      console.log(`🔍 [Bundle Content API] Getting content from bundle document...`)

      let bundleContents = []

      if (bundleData.detailedContentItems && Array.isArray(bundleData.detailedContentItems)) {
        bundleContents = bundleData.detailedContentItems
        console.log(`✅ [Bundle Content API] Found ${bundleContents.length} detailed content items in bundle`)
      } else {
        // Fallback to searching through other fields if detailedContentItems doesn't exist
        const possibleContentFields = [
          "content",
          "contents",
          "items",
          "videos",
          "files",
          "bundleContent",
          "bundleContents",
          "contentItems",
          "videoItems",
          "bundleItems",
        ]

        for (const field of possibleContentFields) {
          if (bundleData[field] && Array.isArray(bundleData[field])) {
            bundleContents = bundleData[field]
            console.log(
              `✅ [Bundle Content API] Found ${bundleContents.length} content items in bundle field: ${field}`,
            )
            break
          }
        }
      }

      if (bundleContents.length > 0) {
        const processedContents = bundleContents.map((content, index) => ({
          id:
            content.id || content.uploadId || content.contentId || content.videoId || content._id || `content_${index}`,
          title: content.title || content.displayTitle || content.name || content.filename || `Video ${index + 1}`,
          description: content.description || content.desc || "",
          contentType: content.contentType || content.type || "video",
          fileType: content.fileType || content.mimeType || content.contentType || "video/mp4",
          size: content.size || content.fileSize || content.displaySize || 0,
          duration: content.duration || 0,
          thumbnailUrl: content.thumbnailUrl || content.thumbnail || content.previewUrl || content.thumb || "",
          fileUrl:
            content.fileUrl ||
            content.videoUrl ||
            content.downloadUrl ||
            content.url ||
            content.src ||
            content.link ||
            "",
          downloadUrl: content.downloadUrl || content.fileUrl || content.videoUrl || content.url || "",
          videoUrl: content.fileUrl || content.videoUrl || content.downloadUrl || content.url || "",
          createdAt: content.createdAt || content.uploadedAt || content.timestamp || new Date().toISOString(),
          metadata: content.metadata || content.meta || {},
        }))

        const bundleInfo = {
          id: bundleId,
          title: bundleData.title || bundleData.displayTitle || "Untitled Bundle",
          description: bundleData.description || "",
          creatorId: bundleData.creatorId || bundleData.creatorUid || "",
          creatorUsername: bundleData.creatorUsername || bundleData.creatorName || "Unknown Creator",
          thumbnailUrl: bundleData.thumbnailUrl || "",
          price: bundleData.price || 0,
          currency: bundleData.currency || "usd",
        }

        const response = {
          hasAccess: true,
          bundle: bundleInfo,
          contents: processedContents,
          isOwner: true,
        }

        console.log(`✅ [Bundle Content API] Returning owner content with ${processedContents.length} items`)
        return NextResponse.json(response)
      }
    }

    // If not owner or no content found in bundle, check purchases
    console.log(`🔍 [Bundle Content API] User is not owner, checking purchases...`)

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
    console.log(`📄 [Bundle Content API] Full purchase data keys:`, Object.keys(purchaseData))

    // Deep search through ALL fields and nested objects for content
    let bundleContents = []

    // Function to recursively search for content arrays
    const findContentArrays = (obj: any, path = ""): any[] => {
      const results = []

      if (Array.isArray(obj)) {
        // Check if this array contains video-like objects
        if (obj.length > 0 && obj[0] && typeof obj[0] === "object") {
          const firstItem = obj[0]
          // Look for video-like properties
          if (
            firstItem.fileUrl ||
            firstItem.videoUrl ||
            firstItem.downloadUrl ||
            firstItem.title ||
            firstItem.filename ||
            firstItem.displayTitle ||
            firstItem.mimeType ||
            firstItem.contentType
          ) {
            console.log(`🎯 [Bundle Content API] Found content array at path: ${path} with ${obj.length} items`)
            results.push(...obj)
          }
        }
      } else if (obj && typeof obj === "object") {
        // Recursively search nested objects
        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key
          results.push(...findContentArrays(value, newPath))
        }
      }

      return results
    }

    // Search through the entire purchase document
    bundleContents = findContentArrays(purchaseData)

    console.log(`🔍 [Bundle Content API] Found ${bundleContents.length} content items through deep search`)

    // If deep search didn't find anything, try direct field access
    if (bundleContents.length === 0) {
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
        "data",
        "videoData",
        "fileData",
        "mediaItems",
        "media",
      ]

      console.log(`🔍 [Bundle Content API] Deep search failed, trying direct field access...`)

      for (const field of possibleContentFields) {
        if (purchaseData[field] && Array.isArray(purchaseData[field])) {
          bundleContents = purchaseData[field]
          console.log(`✅ [Bundle Content API] Found ${bundleContents.length} content items in field: ${field}`)
          break
        }
      }
    }

    // Log what we found
    if (bundleContents.length > 0) {
      console.log(`📹 [Bundle Content API] Sample content item:`, JSON.stringify(bundleContents[0], null, 2))
    } else {
      console.log(`❌ [Bundle Content API] No content found. Available top-level fields:`)
      Object.keys(purchaseData).forEach((key) => {
        const value = purchaseData[key]
        if (Array.isArray(value)) {
          console.log(`  - ${key}: Array with ${value.length} items`)
          if (value.length > 0) {
            console.log(`    First item type: ${typeof value[0]}`)
            if (typeof value[0] === "object") {
              console.log(`    First item keys: ${Object.keys(value[0])}`)
            }
          }
        } else if (typeof value === "object" && value !== null) {
          console.log(`  - ${key}: Object with keys: ${Object.keys(value)}`)
        } else {
          console.log(`  - ${key}: ${typeof value}`)
        }
      })
    }

    const uniqueContents = []
    const seenIds = new Set()
    const seenUrls = new Set()

    for (const content of bundleContents) {
      const contentId = content.id || content.contentId || content.videoId || content._id
      const fileUrl = content.fileUrl || content.videoUrl || content.downloadUrl || content.url

      // Skip if we've already seen this content ID or file URL
      if ((contentId && seenIds.has(contentId)) || (fileUrl && seenUrls.has(fileUrl))) {
        console.log(`🔄 [Bundle Content API] Skipping duplicate content: ${contentId || fileUrl}`)
        continue
      }

      if (contentId) seenIds.add(contentId)
      if (fileUrl) seenUrls.add(fileUrl)
      uniqueContents.push(content)
    }

    bundleContents = uniqueContents
    console.log(`🔍 [Bundle Content API] After deduplication: ${bundleContents.length} unique content items`)

    // Extract bundle info from purchase document
    const bundleInfo = {
      id: bundleId,
      title: purchaseData.bundleTitle || purchaseData.title || purchaseData.displayTitle || "Untitled Bundle",
      description: purchaseData.bundleDescription || purchaseData.description || "",
      creatorId: purchaseData.creatorId || purchaseData.creatorUid || "",
      creatorUsername:
        purchaseData.creatorUsername || purchaseData.creatorName || purchaseData.creator || "Unknown Creator",
      thumbnailUrl: purchaseData.bundleThumbnailUrl || purchaseData.thumbnailUrl || "",
      price: purchaseData.price || purchaseData.amount || 0,
      currency: purchaseData.currency || "usd",
    }

    console.log(`📦 [Bundle Content API] Extracted bundle info:`, bundleInfo)

    // Process content to ensure proper structure for 9:16 video display
    const processedContents = bundleContents.map((content, index) => {
      // Handle all possible field names for video URLs
      const videoUrl =
        content.fileUrl || content.videoUrl || content.downloadUrl || content.url || content.src || content.link || ""

      const processedContent = {
        id: content.id || content.contentId || content.videoId || content._id || `content_${index}`,
        title: content.title || content.displayTitle || content.name || content.filename || `Video ${index + 1}`,
        description: content.description || content.desc || "",
        contentType: content.contentType || content.type || "video",
        fileType: content.fileType || content.mimeType || content.contentType || "video/mp4",
        size: content.size || content.fileSize || content.displaySize || 0,
        duration: content.duration || 0,
        thumbnailUrl: content.thumbnailUrl || content.thumbnail || content.previewUrl || content.thumb || "",
        fileUrl: videoUrl,
        downloadUrl: videoUrl,
        videoUrl: videoUrl,
        createdAt: content.createdAt || content.uploadedAt || content.timestamp || new Date().toISOString(),
        metadata: content.metadata || content.meta || {},
      }

      console.log(`📹 [Bundle Content API] Processed content ${index + 1}:`, {
        id: processedContent.id,
        title: processedContent.title,
        hasVideoUrl: !!processedContent.fileUrl,
        videoUrl: processedContent.fileUrl ? processedContent.fileUrl.substring(0, 50) + "..." : "MISSING",
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
      isOwner: false,
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
