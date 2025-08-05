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

    // STEP 1: Get bundle details from bundles collection (PRIMARY SOURCE)
    console.log(`🔍 [Bundle Content API] Fetching bundle details from bundles collection...`)

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle Content API] Bundle not found in bundles collection: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Bundle Content API] Bundle found in bundles collection`)
    console.log(`📦 [Bundle Content API] Bundle title: ${bundleData.title || bundleData.name || "Untitled"}`)
    console.log(`📦 [Bundle Content API] Bundle data keys:`, Object.keys(bundleData))

    // STEP 2: Verify user has purchased this bundle
    console.log(`🔍 [Bundle Content API] Verifying user purchase...`)

    let purchaseDoc = null
    let purchaseData = null

    // Strategy 1: Direct document ID patterns
    const possibleDocIds = [
      `${userUid}_${bundleId}`,
      `${bundleId}_${userUid}`,
      bundleId,
      `purchase_${bundleId}`,
      `${userUid}-${bundleId}`,
      `${bundleId}-${userUid}`,
    ]

    for (const docId of possibleDocIds) {
      try {
        console.log(`🔍 [Bundle Content API] Trying document ID: ${docId}`)
        const docRef = await db.collection("bundlePurchases").doc(docId).get()
        if (docRef.exists) {
          const data = docRef.data()!
          // Verify this purchase belongs to the user
          if (
            data.buyerUid === userUid ||
            data.userId === userUid ||
            data.buyerId === userUid ||
            data.userUid === userUid
          ) {
            purchaseDoc = docRef
            purchaseData = data
            console.log(`✅ [Bundle Content API] Found purchase by document ID: ${docId}`)
            break
          }
        }
      } catch (error) {
        console.log(`⚠️ [Bundle Content API] Error checking document ID ${docId}:`, error)
      }
    }

    // Strategy 2: Query by user fields and bundle ID
    if (!purchaseDoc) {
      console.log(`🔍 [Bundle Content API] Document ID search failed, trying field queries...`)

      const userFields = ["buyerUid", "userId", "buyerId", "userUid"]
      const bundleFields = ["bundleId", "itemId"]

      for (const userField of userFields) {
        if (purchaseDoc) break

        for (const bundleField of bundleFields) {
          if (purchaseDoc) break

          console.log(`🔍 [Bundle Content API] Querying ${userField} = ${userUid} AND ${bundleField} = ${bundleId}`)

          try {
            const querySnapshot = await db
              .collection("bundlePurchases")
              .where(userField, "==", userUid)
              .where(bundleField, "==", bundleId)
              .limit(1)
              .get()

            if (!querySnapshot.empty) {
              purchaseDoc = querySnapshot.docs[0]
              purchaseData = purchaseDoc.data()
              console.log(`✅ [Bundle Content API] Found purchase using fields: ${userField} + ${bundleField}`)
              break
            }
          } catch (error) {
            console.log(`⚠️ [Bundle Content API] Query failed for ${userField} + ${bundleField}:`, error)
          }
        }
      }
    }

    // Strategy 3: Broader search by user only, then filter
    if (!purchaseDoc) {
      console.log(`🔍 [Bundle Content API] Field queries failed, trying broader user search...`)

      for (const userField of ["buyerUid", "userId", "buyerId", "userUid"]) {
        if (purchaseDoc) break

        try {
          const querySnapshot = await db.collection("bundlePurchases").where(userField, "==", userUid).get()

          for (const doc of querySnapshot.docs) {
            const data = doc.data()
            // Check if this document relates to our bundle
            if (data.bundleId === bundleId || data.itemId === bundleId || doc.id.includes(bundleId)) {
              purchaseDoc = doc
              purchaseData = data
              console.log(`✅ [Bundle Content API] Found purchase via broader search: ${doc.id}`)
              break
            }
          }
        } catch (error) {
          console.log(`⚠️ [Bundle Content API] Broader search failed for ${userField}:`, error)
        }
      }
    }

    // If no purchase found, user doesn't have access
    if (!purchaseDoc || !purchaseData) {
      console.log(`❌ [Bundle Content API] No purchase found for user ${userUid} and bundle ${bundleId}`)
      return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
    }

    console.log(`✅ [Bundle Content API] Purchase verified! Document ID: ${purchaseDoc.id}`)

    // STEP 3: Extract content from bundles collection (PRIMARY SOURCE)
    console.log(`🔍 [Bundle Content API] Extracting content from bundles collection...`)

    // Function to recursively find all video/content items in the bundle document
    const extractAllContent = (obj: any, path = "", depth = 0): any[] => {
      if (depth > 10) return [] // Prevent infinite recursion

      const results = []

      if (Array.isArray(obj)) {
        // Check if this is a content array
        for (let i = 0; i < obj.length; i++) {
          const item = obj[i]
          if (item && typeof item === "object") {
            // Check if this looks like a content item
            if (
              item.fileUrl ||
              item.videoUrl ||
              item.downloadUrl ||
              item.url ||
              item.src ||
              item.link ||
              item.title ||
              item.filename ||
              item.name ||
              item.displayTitle ||
              item.mimeType ||
              item.contentType ||
              item.type
            ) {
              console.log(`🎯 [Bundle Content API] Found content item at ${path}[${i}]:`, {
                title: item.title || item.filename || item.name,
                hasUrl: !!(item.fileUrl || item.videoUrl || item.downloadUrl || item.url || item.src || item.link),
              })
              results.push({ ...item, _path: `${path}[${i}]`, _index: i })
            } else {
              // Recursively search nested objects
              results.push(...extractAllContent(item, `${path}[${i}]`, depth + 1))
            }
          }
        }
      } else if (obj && typeof obj === "object") {
        // Search through object properties
        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key
          results.push(...extractAllContent(value, newPath, depth + 1))
        }
      }

      return results
    }

    // Extract all content from the bundle document (PRIMARY SOURCE)
    let allContent = extractAllContent(bundleData)

    console.log(`🔍 [Bundle Content API] Found ${allContent.length} content items from bundles collection`)

    // If recursive extraction didn't find anything, try direct field access on bundle
    if (allContent.length === 0) {
      console.log(`🔍 [Bundle Content API] Recursive extraction failed, trying direct field access on bundle...`)

      const contentFields = [
        "content",
        "contents",
        "items",
        "videos",
        "files",
        "contentItems",
        "videoItems",
        "bundleItems",
        "data",
        "videoData",
        "fileData",
        "mediaItems",
        "media",
        "assets",
        "downloads",
      ]

      for (const field of contentFields) {
        if (bundleData[field]) {
          if (Array.isArray(bundleData[field])) {
            allContent = bundleData[field].map((item, index) => ({
              ...item,
              _path: field,
              _index: index,
            }))
            console.log(`✅ [Bundle Content API] Found ${allContent.length} content items in bundle field: ${field}`)
            break
          } else if (typeof bundleData[field] === "object") {
            // Try to extract from nested object
            const nestedContent = extractAllContent(bundleData[field], field, 1)
            if (nestedContent.length > 0) {
              allContent = nestedContent
              console.log(
                `✅ [Bundle Content API] Found ${allContent.length} content items in nested bundle field: ${field}`,
              )
              break
            }
          }
        }
      }
    }

    // FALLBACK: If no content found in bundle, check purchase document
    if (allContent.length === 0) {
      console.log(`⚠️ [Bundle Content API] No content found in bundle, checking purchase document as fallback...`)

      const purchaseContent = extractAllContent(purchaseData)
      if (purchaseContent.length > 0) {
        allContent = purchaseContent
        console.log(`✅ [Bundle Content API] Found ${allContent.length} content items in purchase document (fallback)`)
      }
    }

    // ENHANCED CONTENT PROCESSING with multiple URL fallbacks
    const processedContents = allContent.map((content, index) => {
      // Extract video URL with comprehensive fallbacks
      const possibleUrlFields = [
        "fileUrl",
        "videoUrl",
        "downloadUrl",
        "url",
        "src",
        "link",
        "directUrl",
        "publicUrl",
        "streamUrl",
        "playbackUrl",
        "mediaUrl",
        "contentUrl",
        "assetUrl",
        "downloadLink",
        "viewUrl",
        "accessUrl",
      ]

      let videoUrl = ""
      for (const field of possibleUrlFields) {
        if (content[field] && typeof content[field] === "string" && content[field].trim()) {
          videoUrl = content[field].trim()
          console.log(`📹 [Bundle Content API] Found video URL in field '${field}' for item ${index + 1}`)
          break
        }
      }

      // Extract title with fallbacks
      const possibleTitleFields = [
        "title",
        "displayTitle",
        "name",
        "filename",
        "originalFileName",
        "displayName",
        "label",
        "caption",
      ]

      let title = ""
      for (const field of possibleTitleFields) {
        if (content[field] && typeof content[field] === "string" && content[field].trim()) {
          title = content[field].trim()
          break
        }
      }

      if (!title) {
        title = `Video ${index + 1}`
      }

      // Extract thumbnail with fallbacks
      const possibleThumbnailFields = [
        "thumbnailUrl",
        "thumbnail",
        "previewUrl",
        "thumb",
        "posterUrl",
        "coverUrl",
        "imageUrl",
        "preview",
        "screenshotUrl",
      ]

      let thumbnailUrl = ""
      for (const field of possibleThumbnailFields) {
        if (content[field] && typeof content[field] === "string" && content[field].trim()) {
          thumbnailUrl = content[field].trim()
          break
        }
      }

      // Extract other metadata
      const description = content.description || content.desc || content.summary || ""
      const fileType = content.fileType || content.mimeType || content.contentType || content.type || "video/mp4"
      const size = content.size || content.fileSize || content.fileSizeBytes || 0
      const duration = content.duration || content.length || 0

      const processedContent = {
        id: content.id || content.contentId || content.videoId || content._id || `content_${index}`,
        title,
        description,
        type: content.type || content.contentType || "video",
        fileType,
        size: typeof size === "number" ? size : Number.parseInt(size) || 0,
        duration: typeof duration === "number" ? duration : Number.parseInt(duration) || 0,
        thumbnailUrl: thumbnailUrl || null,
        fileUrl: videoUrl,
        downloadUrl: videoUrl,
        videoUrl: videoUrl,
        createdAt: content.createdAt || content.uploadedAt || content.timestamp || new Date().toISOString(),
        metadata: content.metadata || content.meta || {},
        _debug: {
          originalPath: content._path,
          originalIndex: content._index,
          foundUrlIn: possibleUrlFields.find((field) => content[field]),
          foundTitleIn: possibleTitleFields.find((field) => content[field]),
          allFields: Object.keys(content),
        },
      }

      console.log(`📹 [Bundle Content API] Processed content ${index + 1}:`, {
        id: processedContent.id,
        title: processedContent.title,
        hasVideoUrl: !!processedContent.fileUrl,
        videoUrlLength: processedContent.fileUrl?.length || 0,
        videoUrlPreview: processedContent.fileUrl ? processedContent.fileUrl.substring(0, 100) + "..." : "MISSING",
        hasThumbnail: !!processedContent.thumbnailUrl,
        foundUrlIn: processedContent._debug.foundUrlIn,
      })

      return processedContent
    })

    // Filter out content without video URLs and log issues
    const validContent = processedContents.filter((content) => {
      if (!content.fileUrl) {
        console.warn(`⚠️ [Bundle Content API] Skipping content without video URL:`, {
          id: content.id,
          title: content.title,
          availableFields: content._debug.allFields,
        })
        return false
      }
      return true
    })

    console.log(
      `✅ [Bundle Content API] ${validContent.length} valid content items (${processedContents.length - validContent.length} skipped due to missing URLs)`,
    )

    // STEP 4: Extract bundle info from bundles collection (PRIMARY SOURCE)
    const bundleInfo = {
      id: bundleId,
      title:
        bundleData.title || bundleData.name || bundleData.displayTitle || bundleData.bundleName || "Untitled Bundle",
      description: bundleData.description || bundleData.desc || bundleData.summary || bundleData.about || "",
      creatorId: bundleData.creatorId || bundleData.userId || bundleData.ownerId || bundleData.authorId || "",
      creatorUsername:
        bundleData.creatorUsername ||
        bundleData.creatorName ||
        bundleData.username ||
        bundleData.creator ||
        "Unknown Creator",
      thumbnailUrl:
        bundleData.thumbnailUrl || bundleData.thumbnail || bundleData.previewUrl || bundleData.imageUrl || "",
      price: bundleData.price || bundleData.cost || bundleData.amount || 0,
      currency: bundleData.currency || "usd",
      tags: bundleData.tags || bundleData.categories || bundleData.labels || [],
      createdAt: bundleData.createdAt || bundleData.uploadedAt || bundleData.timestamp,
      fileSize: bundleData.fileSize || bundleData.size || bundleData.totalSize || 0,
      quality: bundleData.quality || bundleData.videoQuality || bundleData.resolution || "",
      views: bundleData.viewCount || bundleData.views || bundleData.totalViews || 0,
      downloads: bundleData.downloadCount || bundleData.downloads || bundleData.totalDownloads || 0,
    }

    // Get creator info if available
    let creatorData = null
    if (bundleInfo.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleInfo.creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
          // Update creator info with actual user data
          bundleInfo.creatorUsername =
            creatorData?.username || creatorData?.displayName || creatorData?.name || bundleInfo.creatorUsername
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle Content API] Could not fetch creator data:`, error)
      }
    }

    const response = {
      hasAccess: true,
      bundle: bundleInfo,
      contents: validContent,
      purchaseInfo: {
        purchaseId: purchaseDoc.id,
        purchaseDate: purchaseData.createdAt || purchaseData.purchaseDate || purchaseData.timestamp,
        status: purchaseData.status || "completed",
      },
      _debug: {
        totalContentFound: allContent.length,
        validContentReturned: validContent.length,
        purchaseDocumentId: purchaseDoc.id,
        bundleDocumentExists: true,
        contentSource: allContent.length > 0 ? "bundles_collection" : "purchase_document_fallback",
        searchStrategiesUsed: "comprehensive",
      },
    }

    console.log(`✅ [Bundle Content API] Returning response with ${validContent.length} valid content items`)
    console.log(`📊 [Bundle Content API] Content source: ${response._debug.contentSource}`)

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
