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

    try {
      // Get bundle document directly from bundles collection
      const bundleRef = await db.collection("bundles").doc(bundleId).get()

      if (!bundleRef.exists) {
        console.log(`❌ [Bundle Content API] Bundle document not found`)
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const bundleData = bundleRef.data()
      console.log(`✅ [Bundle Content API] Bundle found: ${bundleData.title}`)

      // Check if user is the bundle creator
      const creatorId = bundleData.creatorId
      if (creatorId !== userUid) {
        console.log(`❌ [Bundle Content API] User ${userUid} is not the creator ${creatorId}`)
        return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
      }

      console.log(`✅ [Bundle Content API] User is bundle owner, fetching content details`)

      const detailedContentItems = bundleData.detailedContentItems || []
      const contentItems = bundleData.contentItems || []
      const content = bundleData.content || []

      // Get content IDs from any available source
      let contentIds = []
      if (detailedContentItems.length > 0) {
        contentIds = detailedContentItems.map((item) => item.id).filter(Boolean)
      } else if (contentItems.length > 0) {
        contentIds = contentItems.map((item) => item.id || item).filter(Boolean)
      } else if (content.length > 0) {
        contentIds = content.map((item) => item.id || item).filter(Boolean)
      }

      console.log(`🔍 [Bundle Content API] Found ${contentIds.length} content IDs:`, contentIds)

      // Fetch full video details from creatorUploads collection
      const fullContentItems = []
      if (contentIds.length > 0) {
        for (const contentId of contentIds) {
          try {
            const videoRef = await db.collection("creatorUploads").doc(contentId).get()
            if (videoRef.exists) {
              const videoData = videoRef.data()
              fullContentItems.push({
                id: contentId,
                title: videoData.title || videoData.name || `Video ${fullContentItems.length + 1}`,
                description: videoData.description || "",
                contentType: "video",
                fileType: videoData.mimeType || "video/mp4",
                size: videoData.fileSize || 0,
                duration: videoData.duration || 0,
                thumbnailUrl: videoData.thumbnailUrl || "",
                fileUrl: videoData.fileUrl || "",
                downloadUrl: videoData.downloadUrl || videoData.fileUrl || "",
                videoUrl: videoData.fileUrl || "",
                createdAt: videoData.createdAt || new Date().toISOString(),
                metadata: videoData.metadata || {},
              })
            } else {
              console.log(`⚠️ [Bundle Content API] Video not found: ${contentId}`)
            }
          } catch (error) {
            console.error(`❌ [Bundle Content API] Error fetching video ${contentId}:`, error)
          }
        }
      }

      const response = {
        hasAccess: true,
        bundle: {
          id: bundleId,
          title: bundleData.title || "Untitled Bundle",
          description: bundleData.description || "",
          creatorId: bundleData.creatorId,
          thumbnailUrl: bundleData.coverImage || bundleData.thumbnailUrl || "",
          price: bundleData.price || 0,
          currency: bundleData.currency || "usd",
        },
        contents: fullContentItems,
        isOwner: true,
      }

      console.log(`✅ [Bundle Content API] Returning ${fullContentItems.length} content items with full metadata`)
      return NextResponse.json(response)
    } catch (error) {
      console.error("❌ [Bundle Content API] Error accessing bundle:", error)
      return NextResponse.json({ error: "Error accessing bundle" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Bundle Content API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
