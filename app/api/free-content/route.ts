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
    const snapshot = await db
      .collection("free_content")
      .where("uid", "==", userId)
      .orderBy("addedAt", "desc")
      .limit(100)
      .get()

    const freeContent = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || "",
        type: data.type || "unknown",
        size: data.size || 0,
        addedAt: data.addedAt?.toDate?.() || new Date(),
        ...data,
      }
    })

    console.log(`✅ [Free Content] Found ${freeContent.length} items`)

    return NextResponse.json({
      success: true,
      freeContent,
      count: freeContent.length,
    })
  } catch (error) {
    console.error("❌ [Free Content] Error:", error)
    return NextResponse.json({ error: "Failed to fetch free content" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { uploadIds } = await request.json()

    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({ error: "No upload IDs provided" }, { status: 400 })
    }

    console.log("🔍 [Free Content] Adding uploads to free content:", uploadIds)

    // Find the uploads in various collections
    const collections = ["uploads", "videos", "content"]
    const foundUploads: any[] = []

    for (const collectionName of collections) {
      try {
        for (const uploadId of uploadIds) {
          const doc = await db.collection(collectionName).doc(uploadId).get()
          if (doc.exists) {
            const data = doc.data()
            if (data?.uid === userId) {
              foundUploads.push({
                id: doc.id,
                ...data,
                sourceCollection: collectionName,
              })
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ [Free Content] Error checking ${collectionName}:`, error)
      }
    }

    if (foundUploads.length === 0) {
      return NextResponse.json({ error: "No valid uploads found" }, { status: 400 })
    }

    // Add to free_content collection
    const batch = db.batch()
    const addedIds: string[] = []

    for (const upload of foundUploads) {
      try {
        const freeContentRef = db.collection("free_content").doc()
        batch.set(freeContentRef, {
          uid: userId,
          title: upload.title || upload.filename || "Untitled",
          fileUrl: upload.fileUrl || upload.url || "",
          type: upload.type || upload.mimeType || "unknown",
          size: upload.size || upload.fileSize || 0,
          thumbnailUrl: upload.thumbnailUrl || upload.thumbnail || "",
          mimeType: upload.mimeType || upload.type || "",
          duration: upload.duration || 0,
          addedAt: new Date(),
          originalId: upload.id,
          sourceCollection: upload.sourceCollection,
        })
        addedIds.push(freeContentRef.id)
      } catch (error) {
        console.error("❌ [Free Content] Error adding upload:", upload.id, error)
      }
    }

    await batch.commit()

    console.log(`✅ [Free Content] Added ${addedIds.length} items to free content`)

    return NextResponse.json({
      success: true,
      addedCount: addedIds.length,
      addedIds,
    })
  } catch (error) {
    console.error("❌ [Free Content] Error adding content:", error)
    return NextResponse.json({ error: "Failed to add content to free section" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const url = new URL(request.url)
    const contentId = url.pathname.split("/").pop()

    if (!contentId) {
      return NextResponse.json({ error: "Content ID required" }, { status: 400 })
    }

    console.log("🔍 [Free Content] Removing content:", contentId)

    // Verify ownership and delete
    const doc = await db.collection("free_content").doc(contentId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const data = doc.data()
    if (data?.uid !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await db.collection("free_content").doc(contentId).delete()

    console.log("✅ [Free Content] Removed content:", contentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ [Free Content] Error removing content:", error)
    return NextResponse.json({ error: "Failed to remove content" }, { status: 500 })
  }
}
