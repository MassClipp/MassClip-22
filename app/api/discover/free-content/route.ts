import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

async function getParams(request: NextRequest): Promise<{ limit: number }> {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50 // Default limit
  return { limit }
}

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Discover Free Content] Starting fresh request...")
    console.log("🔍 [Discover Free Content] Request URL:", request.url)
    console.log("🔍 [Discover Free Content] Timestamp:", new Date().toISOString())

    const { limit } = await getParams(request)

    if (!db) {
      console.error("❌ [Discover Free Content] Database not initialized")
      return NextResponse.json(
        {
          success: true,
          videos: [],
          count: 0,
          error: "Database connection failed",
        },
        { status: 200 },
      )
    }

    // Query ONLY the free_content collection - no other sources
    console.log("🔍 [Discover Free Content] Querying ONLY free_content collection...")

    const freeContentRef = db.collection("free_content")
    const snapshot = await freeContentRef.limit(limit).get()

    console.log(`📊 [Discover Free Content] Raw document count: ${snapshot.size}`)

    if (snapshot.empty) {
      console.log("⚠️ [Discover Free Content] No documents found in free_content collection")
      return NextResponse.json({
        success: true,
        videos: [],
        count: 0,
        message: "No free content found",
        timestamp: new Date().toISOString(),
      })
    }

    // Log every single document ID for debugging
    const documentIds = []
    snapshot.forEach((doc) => {
      documentIds.push(doc.id)
    })
    console.log("📋 [Discover Free Content] Document IDs found:", documentIds)

    const videos = []
    const userIds = new Set()
    const processedIds = new Set() // Track processed IDs to prevent duplicates

    // First pass: collect all user IDs and check for duplicates
    snapshot.forEach((doc) => {
      const data = doc.data()

      // Check for duplicate processing
      if (processedIds.has(doc.id)) {
        console.log(`⚠️ [Discover Free Content] Duplicate document ID detected: ${doc.id}`)
        return
      }
      processedIds.add(doc.id)

      console.log(`📄 [Discover Free Content] Processing document ${doc.id}:`, {
        title: data.title,
        uid: data.uid,
        hasFileUrl: !!data.fileUrl,
        addedAt: data.addedAt,
        sourceCollection: data.sourceCollection,
        originalId: data.originalId,
      })

      if (data.uid) {
        userIds.add(data.uid)
      }
    })

    console.log(`👥 [Discover Free Content] Found ${userIds.size} unique creators`)
    console.log(`🔢 [Discover Free Content] Processed ${processedIds.size} unique documents`)

    // Fetch user data for all creators
    const userDataMap = new Map()
    if (userIds.size > 0) {
      const userPromises = Array.from(userIds).map(async (uid) => {
        try {
          const userDoc = await db
            .collection("users")
            .doc(uid as string)
            .get()
          if (userDoc.exists()) {
            const userData = userDoc.data()
            userDataMap.set(uid, {
              name: userData?.displayName || userData?.name || userData?.username || "Unknown Creator",
              username: userData?.username || null,
            })
          } else {
            userDataMap.set(uid, {
              name: "Unknown Creator",
              username: null,
            })
          }
        } catch (error) {
          console.error(`❌ [Discover Free Content] Error fetching user ${uid}:`, error)
          userDataMap.set(uid, {
            name: "Unknown Creator",
            username: null,
          })
        }
      })

      await Promise.all(userPromises)
    }

    // Second pass: process videos (using the same processedIds to ensure no duplicates)
    const videoIds = new Set() // Additional check for video ID duplicates

    snapshot.forEach((doc) => {
      // Skip if we've already processed this document
      if (!processedIds.has(doc.id)) {
        return
      }

      const data = doc.data()
      const creatorData = userDataMap.get(data.uid) || {
        name: "Unknown Creator",
        username: null,
      }

      // Only include videos that have a valid file URL
      const fileUrl = data.fileUrl || data.url || ""
      if (!fileUrl) {
        console.log(`⚠️ [Discover Free Content] Skipping ${doc.id} - no file URL`)
        return
      }

      // Check for duplicate video IDs (in case originalId is the same)
      const videoIdentifier = data.originalId || doc.id
      if (videoIds.has(videoIdentifier)) {
        console.log(`⚠️ [Discover Free Content] Duplicate video identifier detected: ${videoIdentifier}`)
        return
      }
      videoIds.add(videoIdentifier)

      // Handle date properly
      let addedAtDate = new Date()
      try {
        if (data.addedAt) {
          if (data.addedAt.toDate && typeof data.addedAt.toDate === "function") {
            addedAtDate = data.addedAt.toDate()
          } else if (data.addedAt instanceof Date) {
            addedAtDate = data.addedAt
          } else {
            addedAtDate = new Date(data.addedAt)
          }
        }
      } catch (dateError) {
        console.log(`⚠️ [Discover Free Content] Date parsing error for ${doc.id}:`, dateError)
        addedAtDate = new Date()
      }

      const video = {
        id: doc.id,
        title: data.title || data.filename || "Untitled",
        fileUrl: fileUrl,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail || "/placeholder.svg?height=200&width=300&text=Video",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: addedAtDate,
        uid: data.uid,
        creatorName: creatorData.name,
        creatorUsername: creatorData.username,
        views: data.views || 0,
        downloads: data.downloads || 0,
        originalId: data.originalId,
        sourceCollection: data.sourceCollection,
      }

      videos.push(video)
      console.log(`✅ [Discover Free Content] Added video: ${video.title} by ${creatorData.name} (ID: ${doc.id})`)
    })

    // Sort by addedAt (newest first)
    videos.sort((a, b) => {
      const timeA = new Date(a.addedAt).getTime()
      const timeB = new Date(b.addedAt).getTime()
      return timeB - timeA
    })

    console.log(`✅ [Discover Free Content] Returning ${videos.length} videos`)
    console.log(
      `📋 [Discover Free Content] Final video IDs:`,
      videos.map((v) => v.id),
    )

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
      rawDocumentCount: snapshot.size,
      processedDocumentCount: processedIds.size,
      uniqueVideoCount: videoIds.size,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Discover Free Content] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
