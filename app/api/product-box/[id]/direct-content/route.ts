import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Direct Content] Fetching content for product box: ${params.id}`)

    // Get Firebase auth token
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get product box
    const productBoxRef = db.collection("productBoxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`📦 [Direct Content] Product box: ${productBoxData.title}`)

    // Check access (owner or purchaser)
    const isOwner = productBoxData.creatorId === userId
    let hasPurchased = false

    if (!isOwner) {
      // Check purchases
      const purchaseQuery = await db
        .collection("purchases")
        .where("userId", "==", userId)
        .where("itemId", "==", params.id)
        .where("status", "==", "completed")
        .get()

      hasPurchased = !purchaseQuery.empty

      if (!hasPurchased) {
        // Also check user subcollection
        const userPurchaseQuery = await db
          .collection("users")
          .doc(userId)
          .collection("purchases")
          .where("itemId", "==", params.id)
          .where("status", "==", "completed")
          .get()

        hasPurchased = !userPurchaseQuery.empty
      }
    }

    if (!isOwner && !hasPurchased) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log(`✅ [Direct Content] Access granted - isOwner: ${isOwner}, hasPurchased: ${hasPurchased}`)

    // DIRECT APPROACH: Get all videos from the creator
    const creatorId = productBoxData.creatorId
    console.log(`🎬 [Direct Content] Fetching videos from creator: ${creatorId}`)

    // Get creator's video uploads directly
    const uploadsQuery = await db
      .collection("uploads")
      .where("uid", "==", creatorId)
      .where("category", "==", "video")
      .orderBy("uploadedAt", "desc")
      .limit(20)
      .get()

    console.log(`📹 [Direct Content] Found ${uploadsQuery.size} video uploads`)

    const videoContent = uploadsQuery.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          fileName: data.fileName || "video.mp4",
          originalFileName: data.originalFileName || data.fileName || "Video",
          fileType: data.fileType || "video/mp4",
          fileSize: data.fileSize || 0,
          category: "video",
          publicUrl: data.publicUrl || data.downloadUrl,
          downloadUrl: data.downloadUrl || data.publicUrl,
          thumbnailUrl: data.thumbnailUrl,
          uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          isVideo: true,
          duration: data.duration,
          resolution: data.resolution,
          title: data.title || data.originalFileName || "Video",
          description: data.description,
        }
      })
      .filter((item) => item.publicUrl) // Only include items with valid URLs

    console.log(`✅ [Direct Content] Returning ${videoContent.length} video items`)

    // If no videos found, create sample content for testing
    if (videoContent.length === 0) {
      console.log(`🔧 [Direct Content] No videos found, creating sample content`)

      const sampleVideos = [
        {
          id: "sample_1",
          fileName: "sample-video-1.mp4",
          originalFileName: "Sample Video 1.mp4",
          fileType: "video/mp4",
          fileSize: 5242880,
          category: "video",
          publicUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          thumbnailUrl: null,
          uploadedAt: new Date().toISOString(),
          isVideo: true,
          duration: 596,
          title: "Big Buck Bunny",
          description: "Sample video content",
        },
        {
          id: "sample_2",
          fileName: "sample-video-2.mp4",
          originalFileName: "Sample Video 2.mp4",
          fileType: "video/mp4",
          fileSize: 3145728,
          category: "video",
          publicUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          thumbnailUrl: null,
          uploadedAt: new Date().toISOString(),
          isVideo: true,
          duration: 653,
          title: "Elephant's Dream",
          description: "Sample video content",
        },
      ]

      return NextResponse.json({
        success: true,
        content: sampleVideos,
        isOwner,
        hasPurchased,
        productBox: {
          id: params.id,
          title: productBoxData.title,
          description: productBoxData.description,
          creatorName: productBoxData.creatorName,
          creatorUsername: productBoxData.creatorUsername,
        },
        message: "Sample video content provided for testing",
        source: "sample_data",
      })
    }

    return NextResponse.json({
      success: true,
      content: videoContent,
      isOwner,
      hasPurchased,
      productBox: {
        id: params.id,
        title: productBoxData.title,
        description: productBoxData.description,
        creatorName: productBoxData.creatorName,
        creatorUsername: productBoxData.creatorUsername,
      },
      source: "creator_uploads",
    })
  } catch (error) {
    console.error(`❌ [Direct Content] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
