import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("🔍 [Free Content] Fetching free content for user:", userId)

    // Query free_content collection
    const snapshot = await db.collection("free_content").where("uid", "==", userId).limit(100).get()

    const freeContent = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || "",
        thumbnailUrl: data.thumbnailUrl || null,
        type: data.type || "unknown",
        size: data.size || 0,
        addedAt: data.addedAt?.toDate?.() || new Date(),
        ...data,
      }
    })

    // Sort by addedAt (newest first)
    const sortedContent = freeContent.sort((a, b) => {
      const dateA = new Date(a.addedAt || 0).getTime()
      const dateB = new Date(b.addedAt || 0).getTime()
      return dateB - dateA
    })

    console.log(`✅ [Free Content] Found ${sortedContent.length} items`)

    return NextResponse.json({
      success: true,
      freeContent: sortedContent,
      count: sortedContent.length,
    })
  } catch (error) {
    console.error("❌ [Free Content] Error:", error)
    return NextResponse.json({ error: "Failed to fetch free content" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Free Content] POST request received")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Free Content] No authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("✅ [Free Content] User authenticated:", userId)

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Free Content] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { uploadIds } = body

    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      console.log("❌ [Free Content] No upload IDs provided")
      return NextResponse.json({ error: "No upload IDs provided" }, { status: 400 })
    }

    console.log("🔍 [Free Content] Adding uploads to free content:", uploadIds)

    // Search for uploads in multiple collections
    const collections = ["uploads", "videos", "content", "userUploads"]
    const foundUploads: any[] = []

    for (const uploadId of uploadIds) {
      let found = false

      for (const collectionName of collections) {
        if (found) break

        try {
          console.log(`🔍 [Free Content] Checking ${collectionName} for ${uploadId}`)
          const doc = await db.collection(collectionName).doc(uploadId).get()

          if (doc.exists) {
            const data = doc.data()
            console.log(`✅ [Free Content] Found upload in ${collectionName}:`, data)

            // Check if it belongs to the user
            if (data?.uid === userId || data?.userId === userId || data?.createdBy === userId) {
              foundUploads.push({
                id: doc.id,
                ...data,
                sourceCollection: collectionName,
              })
              found = true
              console.log(`✅ [Free Content] Upload ${uploadId} belongs to user`)
            } else {
              console.log(
                `⚠️ [Free Content] Upload ${uploadId} doesn't belong to user. Owner: ${data?.uid || data?.userId || data?.createdBy}`,
              )
            }
          }
        } catch (error) {
          console.log(`⚠️ [Free Content] Error checking ${collectionName}:`, error)
        }
      }

      if (!found) {
        console.log(`❌ [Free Content] Upload ${uploadId} not found in any collection`)
      }
    }

    if (foundUploads.length === 0) {
      console.log("❌ [Free Content] No valid uploads found")
      return NextResponse.json({ error: "No valid uploads found for your account" }, { status: 400 })
    }

    console.log(`✅ [Free Content] Found ${foundUploads.length} valid uploads`)

    // Check for existing free content to avoid duplicates
    const existingSnapshot = await db.collection("free_content").where("uid", "==", userId).get()

    const existingOriginalIds = new Set()
    const existingUrls = new Set()

    existingSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.originalId) existingOriginalIds.add(data.originalId)
      if (data.fileUrl) existingUrls.add(data.fileUrl)
    })

    console.log(`🔍 [Free Content] Found ${existingSnapshot.docs.length} existing free content items`)
    console.log(`🔍 [Free Content] Existing original IDs:`, Array.from(existingOriginalIds))

    // Add to free_content collection
    const batch = db.batch()
    const addedItems: any[] = []

    for (const upload of foundUploads) {
      try {
        const fileUrl = upload.fileUrl || upload.url || upload.downloadUrl || ""

        // Skip if already exists (check both originalId and fileUrl)
        if (existingOriginalIds.has(upload.id) || existingUrls.has(fileUrl)) {
          console.log(`⚠️ [Free Content] Skipping duplicate: ${upload.title} (ID: ${upload.id})`)
          continue
        }

        const freeContentRef = db.collection("free_content").doc()
        const freeContentData = {
          uid: userId,
          title: upload.title || upload.filename || upload.name || "Untitled",
          fileUrl: fileUrl,
          type: getContentType(upload.mimeType || upload.type || ""),
          size: upload.size || upload.fileSize || 0,
          thumbnailUrl: upload.thumbnailUrl || null, // Include thumbnailUrl from original upload
          mimeType: upload.mimeType || upload.type || "",
          duration: upload.duration || 0,
          addedAt: new Date(),
          originalId: upload.id,
          sourceCollection: upload.sourceCollection,
        }

        batch.set(freeContentRef, freeContentData)
        addedItems.push({
          id: freeContentRef.id,
          ...freeContentData,
        })

        console.log(`✅ [Free Content] Prepared to add: ${freeContentData.title}`)
      } catch (error) {
        console.error("❌ [Free Content] Error preparing upload:", upload.id, error)
      }
    }

    if (addedItems.length === 0) {
      console.log("❌ [Free Content] No new items to add (all duplicates)")
      return NextResponse.json({ error: "All selected items are already in your free content" }, { status: 400 })
    }

    await batch.commit()

    console.log(`✅ [Free Content] Successfully added ${addedItems.length} items to free content`)

    return NextResponse.json({
      success: true,
      message: `Added ${addedItems.length} items to free content`,
      addedCount: addedItems.length,
      addedItems,
    })
  } catch (error) {
    console.error("❌ [Free Content] Error adding content:", error)
    return NextResponse.json(
      {
        error: "Failed to add content to free section",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper function to determine content type
function getContentType(mimeType: string): string {
  if (!mimeType) return "unknown"

  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
