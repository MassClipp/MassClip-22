import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }
}

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

// Fetch content from uploads collection
async function fetchContentFromUploads(contentId: string) {
  try {
    console.log(`🔍 [BundlesMade] Fetching content from uploads: ${contentId}`)

    const uploadDoc = await db.collection("uploads").doc(contentId).get()

    if (!uploadDoc.exists) {
      console.log(`❌ [BundlesMade] Upload not found: ${contentId}`)
      return null
    }

    const data = uploadDoc.data()!

    const title = data.title || data.filename || "Untitled"
    const cleanTitle = title.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")
    const fileUrl = data.fileUrl || data.publicUrl || data.url || ""
    const fileSize = data.size || data.fileSize || 0
    const mimeType = data.mimeType || data.fileType || "application/octet-stream"

    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn(`⚠️ [BundlesMade] Invalid fileUrl for ${contentId}: ${fileUrl}`)
      return null
    }

    return {
      id: contentId,
      title: cleanTitle,
      filename: data.filename || cleanTitle,
      fileUrl: fileUrl,
      publicUrl: data.publicUrl || fileUrl,
      thumbnailUrl: data.thumbnailUrl || "",

      mimeType: mimeType,
      fileSize: fileSize,
      fileSizeFormatted: formatFileSize(fileSize),

      duration: data.duration || 0,
      durationFormatted: formatDuration(data.duration || 0),
      resolution: data.resolution || (data.height ? `${data.height}p` : undefined),
      width: data.width,
      height: data.height,
      quality: data.quality || (data.height >= 1080 ? "HD" : data.height >= 720 ? "HD" : "SD"),

      contentType: getContentType(mimeType),

      uploadedAt: data.uploadedAt?.toDate() || data.createdAt?.toDate() || new Date(),
      creatorId: data.creatorId || data.userId || data.uid || "",

      description: data.description || "",
      tags: data.tags || [],
      isPublic: data.isPublic !== false,
    }
  } catch (error) {
    console.error(`❌ [BundlesMade] Error fetching content ${contentId}:`, error)
    return null
  }
}

// POST - Add content to bundle
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id
    const { contentIds } = await request.json()

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json({ error: "Content IDs are required" }, { status: 400 })
    }

    console.log(`🔍 [BundlesMade] Adding ${contentIds.length} items to bundle: ${bundleId}`)

    // Get the bundle document
    const bundleRef = db.collection("bundlesMade").doc(bundleId)
    const bundleDoc = await bundleRef.get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    // Verify ownership
    if (bundleData.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized - not bundle owner" }, { status: 403 })
    }

    // Fetch new content items
    const newContentItems: any[] = []
    const validContentIds: string[] = []

    for (const contentId of contentIds) {
      const contentItem = await fetchContentFromUploads(contentId)
      if (contentItem) {
        newContentItems.push(contentItem)
        validContentIds.push(contentId)
        console.log(`✅ [BundlesMade] Added content: ${contentItem.title}`)
      } else {
        console.warn(`⚠️ [BundlesMade] Skipped invalid content: ${contentId}`)
      }
    }

    if (newContentItems.length === 0) {
      return NextResponse.json({ error: "No valid content items found" }, { status: 400 })
    }

    // Get existing content and merge with new
    const existingContentItems = bundleData.contentItems || []
    const allContentItems = [...existingContentItems, ...newContentItems]

    // Recalculate statistics
    const totalDuration = allContentItems.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)
    const totalSize = allContentItems.reduce((sum: number, item: any) => sum + item.fileSize, 0)
    const videoCount = allContentItems.filter((item: any) => item.contentType === "video").length
    const audioCount = allContentItems.filter((item: any) => item.contentType === "audio").length
    const imageCount = allContentItems.filter((item: any) => item.contentType === "image").length
    const documentCount = allContentItems.filter((item: any) => item.contentType === "document").length

    // Update bundle
    const updateData = {
      contentItems: allContentItems,
      contentCount: allContentItems.length,
      totalDuration,
      totalSize,
      contentBreakdown: {
        videos: videoCount,
        audio: audioCount,
        images: imageCount,
        documents: documentCount,
      },
      contentTitles: allContentItems.map((item: any) => item.title),
      contentUrls: allContentItems.map((item: any) => item.fileUrl),
      contentThumbnails: allContentItems.map((item: any) => item.thumbnailUrl).filter(Boolean),
      updatedAt: new Date(),
    }

    await bundleRef.update(updateData)

    console.log(`✅ [BundlesMade] Successfully added ${newContentItems.length} items to bundle ${bundleId}`)

    return NextResponse.json({
      success: true,
      message: `Added ${newContentItems.length} content items to bundle`,
      addedItems: newContentItems.length,
      totalItems: allContentItems.length,
      addedContent: newContentItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        contentType: item.contentType,
        size: item.fileSizeFormatted,
        duration: item.durationFormatted,
      })),
    })
  } catch (error) {
    console.error("❌ [BundlesMade] Error adding content:", error)
    return NextResponse.json(
      {
        error: "Failed to add content to bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
