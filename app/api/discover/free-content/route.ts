import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Discover Free Content] Starting request...")

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

    // Add cache-busting headers to ensure fresh data
    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    }

    // Query ALL free content from all creators with better error handling
    console.log("🔍 [Discover Free Content] Querying free_content collection...")

    const freeContentRef = db.collection("free_content")

    // Use multiple query strategies to ensure we get all content
    let snapshot
    try {
      // First try with ordering by addedAt descending (newest first)
      console.log("🔍 [Discover Free Content] Trying query with addedAt ordering...")
      snapshot = await freeContentRef.orderBy("addedAt", "desc").limit(100).get()
      console.log(`📊 [Discover Free Content] Found ${snapshot.size} documents with addedAt ordering`)
    } catch (orderError) {
      console.log("⚠️ [Discover Free Content] addedAt ordering failed, trying without ordering:", orderError)
      try {
        // If ordering fails, get all documents without ordering
        snapshot = await freeContentRef.limit(100).get()
        console.log(`📊 [Discover Free Content] Found ${snapshot.size} documents without ordering`)
      } catch (fallbackError) {
        console.error("❌ [Discover Free Content] All query methods failed:", fallbackError)
        return NextResponse.json(
          {
            success: true,
            videos: [],
            count: 0,
            error: "Database query failed",
          },
          { status: 200, headers },
        )
      }
    }

    const videos = []
    const userIds = new Set()

    // First pass: collect all unique user IDs and log document data
    snapshot.forEach((doc) => {
      const data = doc.data()
      console.log(`📄 [Discover Free Content] Processing document ${doc.id}:`, {
        title: data.title,
        uid: data.uid,
        hasFileUrl: !!data.fileUrl,
        hasUrl: !!data.url,
        addedAt: data.addedAt,
        addedAtType: typeof data.addedAt,
      })

      if (data.uid) {
        userIds.add(data.uid)
      }
    })

    console.log(`👥 [Discover Free Content] Found ${userIds.size} unique creators`)

    // Fetch user data for all creators in parallel with better error handling
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
            console.log(`👤 [Discover Free Content] Loaded user data for ${uid}:`, userDataMap.get(uid))
          } else {
            console.log(`⚠️ [Discover Free Content] User document not found for ${uid}`)
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

    // Second pass: process ALL videos with creator information and better date handling
    snapshot.forEach((doc) => {
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

      // Better date handling - handle various date formats
      let addedAtDate = new Date()
      try {
        if (data.addedAt) {
          if (data.addedAt.toDate && typeof data.addedAt.toDate === "function") {
            // Firestore Timestamp
            addedAtDate = data.addedAt.toDate()
          } else if (data.addedAt instanceof Date) {
            // Already a Date object
            addedAtDate = data.addedAt
          } else if (typeof data.addedAt === "string" || typeof data.addedAt === "number") {
            // String or number timestamp
            addedAtDate = new Date(data.addedAt)
          }
        }
      } catch (dateError) {
        console.log(`⚠️ [Discover Free Content] Date parsing error for ${doc.id}:`, dateError)
        addedAtDate = new Date() // Fallback to current time
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
        // Include timestamp for debugging
        _timestamp: Date.now(),
        // Include all original data
        ...data,
      }

      videos.push(video)
      console.log(
        `✅ [Discover Free Content] Added video ${doc.id}: ${video.title} by ${creatorData.name} (${addedAtDate.toISOString()})`,
      )
    })

    // Sort videos by addedAt (newest first) with better error handling
    videos.sort((a, b) => {
      try {
        const dateA = new Date(a.addedAt).getTime()
        const dateB = new Date(b.addedAt).getTime()

        // If dates are invalid, use current timestamp
        const timeA = isNaN(dateA) ? Date.now() : dateA
        const timeB = isNaN(dateB) ? Date.now() : dateB

        return timeB - timeA // Newest first
      } catch (sortError) {
        console.log("⚠️ [Discover Free Content] Sort error:", sortError)
        return 0
      }
    })

    console.log(`✅ [Discover Free Content] Returning ${videos.length} videos total`)
    console.log(
      `📋 [Discover Free Content] Video titles and dates:`,
      videos.map((v) => ({ title: v.title, addedAt: v.addedAt, id: v.id })),
    )

    return NextResponse.json(
      {
        success: true,
        videos: videos,
        count: videos.length,
        _fetchTime: new Date().toISOString(),
      },
      { headers },
    )
  } catch (error) {
    console.error("❌ [Discover Free Content] Error:", error)

    return NextResponse.json(
      {
        success: true, // Return success: true to prevent UI errors
        videos: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to fetch free content",
        _fetchTime: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  }
}
