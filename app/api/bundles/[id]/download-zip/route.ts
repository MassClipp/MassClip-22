import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import JSZip from "jszip"

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

    console.log(`📦 [ZIP Download] Starting ZIP creation for bundle: ${bundleId}`)

    // Get the authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      console.error("❌ [ZIP Download] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid
    console.log(`👤 [ZIP Download] User UID: ${userUid}`)

    // Get bundle document
    const bundleRef = await db.collection("bundles").doc(bundleId).get()

    if (!bundleRef.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleRef.data()

    // Check if user is the bundle creator
    if (bundleData.creatorId !== userUid) {
      return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
    }

    console.log(`✅ [ZIP Download] User has access, fetching content`)

    // Get content IDs
    const detailedContentItems = bundleData.detailedContentItems || []
    const contentItems = bundleData.contentItems || []
    const content = bundleData.content || []

    let contentIds = []
    if (detailedContentItems.length > 0) {
      contentIds = detailedContentItems.map((item) => item.id || item)
    } else if (contentItems.length > 0) {
      contentIds = contentItems.map((item) => item.id || item)
    } else if (content.length > 0) {
      contentIds = content.map((item) => item.id || item)
    }

    if (contentIds.length === 0) {
      return NextResponse.json({ error: "No content found in bundle" }, { status: 404 })
    }

    console.log(`📦 [ZIP Download] Found ${contentIds.length} content items`)

    // Fetch content documents
    const collectionsToCheck = ["uploads", "videos", "content", "free_content", "creatorUploads", "userUploads"]
    const contentFiles = []

    for (const contentId of contentIds) {
      for (const collectionName of collectionsToCheck) {
        try {
          const videoDoc = await db.collection(collectionName).doc(contentId).get()
          if (videoDoc.exists) {
            const videoData = videoDoc.data()
            const fileUrl = videoData.fileUrl || videoData.url || videoData.publicUrl || videoData.downloadUrl || ""

            if (fileUrl) {
              contentFiles.push({
                url: fileUrl,
                filename: videoData.title || videoData.filename || videoData.name || `file-${contentId}`,
                contentType: videoData.contentType || videoData.type || "video",
                fileType: videoData.fileType || "mp4",
              })
              console.log(`✅ [ZIP Download] Found file: ${videoData.title || contentId}`)
            }
            break
          }
        } catch (error) {
          console.log(`⚠️ [ZIP Download] Error checking ${collectionName}:`, error)
        }
      }
    }

    if (contentFiles.length === 0) {
      return NextResponse.json({ error: "No downloadable files found" }, { status: 404 })
    }

    console.log(`📦 [ZIP Download] Creating ZIP with ${contentFiles.length} files`)

    const getFileExtension = (contentType: string, fileType: string, url: string): string => {
      // Try to extract extension from URL first
      const urlMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/)
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1].toLowerCase()
      }

      // Determine extension based on content type
      const type = contentType.toLowerCase()
      if (type.includes("image")) {
        return fileType || "jpg"
      } else if (type.includes("audio")) {
        return fileType || "mp3"
      } else if (type.includes("video")) {
        return fileType || "mp4"
      }

      // Default fallback
      return fileType || "mp4"
    }

    // Create ZIP file
    const zip = new JSZip()

    // Download and add each file to ZIP
    for (let i = 0; i < contentFiles.length; i++) {
      const file = contentFiles[i]
      try {
        console.log(`⬇️ [ZIP Download] Downloading file ${i + 1}/${contentFiles.length}: ${file.filename}`)

        const response = await fetch(file.url)
        if (!response.ok) {
          console.error(`❌ [ZIP Download] Failed to download ${file.filename}`)
          continue
        }

        const arrayBuffer = await response.arrayBuffer()
        const cleanFilename = file.filename.replace(/[^\w\s.-]/gi, "")

        const extension = getFileExtension(file.contentType, file.fileType, file.url)
        const filenameWithExt = cleanFilename.includes(".") ? cleanFilename : `${cleanFilename}.${extension}`

        zip.file(filenameWithExt, arrayBuffer)
        console.log(`✅ [ZIP Download] Added to ZIP: ${filenameWithExt}`)
      } catch (error) {
        console.error(`❌ [ZIP Download] Error adding ${file.filename} to ZIP:`, error)
      }
    }

    // Generate ZIP
    console.log(`📦 [ZIP Download] Generating ZIP file`)
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    console.log(`✅ [ZIP Download] ZIP created successfully, size: ${zipBuffer.length} bytes`)

    // Return ZIP file
    const bundleTitle = bundleData.title || "bundle"
    const cleanBundleTitle = bundleTitle.replace(/[^\w\s-]/gi, "")
    const zipFilename = `${cleanBundleTitle}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("❌ [ZIP Download] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create ZIP file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
