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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { contentId } = await request.json()

    if (!contentId) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle Content Debug] Starting lookup for content ID: ${contentId}`)

    const results: any = {
      contentId,
      searchResults: {},
      finalResult: null,
      errors: [],
      timestamp: new Date().toISOString(),
    }

    // 1. Try uploads collection
    try {
      console.log(`🔍 [Debug] Checking uploads collection for: ${contentId}`)
      const uploadsDoc = await db.collection("uploads").doc(contentId).get()

      results.searchResults.uploads = {
        exists: uploadsDoc.exists,
        data: uploadsDoc.exists ? uploadsDoc.data() : null,
        docId: contentId,
        collection: "uploads",
      }

      if (uploadsDoc.exists) {
        const data = uploadsDoc.data()!
        console.log(`✅ [Debug] Found in uploads:`, {
          title: data.title,
          filename: data.filename,
          fileUrl: data.fileUrl,
          publicUrl: data.publicUrl,
          mimeType: data.mimeType,
          type: data.type,
        })
      } else {
        console.log(`❌ [Debug] Not found in uploads collection`)
      }
    } catch (error) {
      console.error(`❌ [Debug] Error checking uploads:`, error)
      results.errors.push(`uploads: ${error}`)
    }

    // 2. Try productBoxContent collection
    try {
      console.log(`🔍 [Debug] Checking productBoxContent collection for: ${contentId}`)
      const productBoxContentDoc = await db.collection("productBoxContent").doc(contentId).get()

      results.searchResults.productBoxContent = {
        exists: productBoxContentDoc.exists,
        data: productBoxContentDoc.exists ? productBoxContentDoc.data() : null,
        docId: contentId,
        collection: "productBoxContent",
      }

      if (productBoxContentDoc.exists) {
        const data = productBoxContentDoc.data()!
        console.log(`✅ [Debug] Found in productBoxContent:`, {
          title: data.title,
          filename: data.filename,
          fileUrl: data.fileUrl,
          publicUrl: data.publicUrl,
          uploadId: data.uploadId,
        })

        // If we have an uploadId, try to get the original upload data
        if (data.uploadId) {
          try {
            console.log(`🔍 [Debug] Checking original upload via uploadId: ${data.uploadId}`)
            const originalUpload = await db.collection("uploads").doc(data.uploadId).get()

            results.searchResults.originalUpload = {
              exists: originalUpload.exists,
              data: originalUpload.exists ? originalUpload.data() : null,
              docId: data.uploadId,
              collection: "uploads (via productBoxContent)",
            }

            if (originalUpload.exists) {
              const originalData = originalUpload.data()!
              console.log(`✅ [Debug] Found original upload:`, {
                title: originalData.title,
                filename: originalData.filename,
                fileUrl: originalData.fileUrl,
                publicUrl: originalData.publicUrl,
              })
            }
          } catch (error) {
            console.error(`❌ [Debug] Error checking original upload:`, error)
            results.errors.push(`originalUpload: ${error}`)
          }
        }
      } else {
        console.log(`❌ [Debug] Not found in productBoxContent collection`)
      }
    } catch (error) {
      console.error(`❌ [Debug] Error checking productBoxContent:`, error)
      results.errors.push(`productBoxContent: ${error}`)
    }

    // 3. Try creatorUploads collection
    try {
      console.log(`🔍 [Debug] Checking creatorUploads collection for: ${contentId}`)
      const creatorUploadsQuery = await db.collection("creatorUploads").where("id", "==", contentId).limit(1).get()

      results.searchResults.creatorUploads = {
        exists: !creatorUploadsQuery.empty,
        data: !creatorUploadsQuery.empty ? creatorUploadsQuery.docs[0].data() : null,
        docId: !creatorUploadsQuery.empty ? creatorUploadsQuery.docs[0].id : null,
        collection: "creatorUploads",
        queryField: "id",
      }

      if (!creatorUploadsQuery.empty) {
        const data = creatorUploadsQuery.docs[0].data()
        console.log(`✅ [Debug] Found in creatorUploads:`, {
          title: data.title,
          filename: data.filename,
          fileUrl: data.fileUrl,
          publicUrl: data.publicUrl,
        })
      } else {
        console.log(`❌ [Debug] Not found in creatorUploads collection`)
      }
    } catch (error) {
      console.error(`❌ [Debug] Error checking creatorUploads:`, error)
      results.errors.push(`creatorUploads: ${error}`)
    }

    // 4. Try searching by different field names in uploads
    try {
      console.log(`🔍 [Debug] Trying alternative searches in uploads collection`)

      // Search by filename
      const filenameQuery = await db.collection("uploads").where("filename", "==", contentId).limit(1).get()
      results.searchResults.uploadsByFilename = {
        exists: !filenameQuery.empty,
        data: !filenameQuery.empty ? filenameQuery.docs[0].data() : null,
        docId: !filenameQuery.empty ? filenameQuery.docs[0].id : null,
        collection: "uploads",
        queryField: "filename",
      }

      // Search by r2Key
      const r2KeyQuery = await db.collection("uploads").where("r2Key", "==", contentId).limit(1).get()
      results.searchResults.uploadsByR2Key = {
        exists: !r2KeyQuery.empty,
        data: !r2KeyQuery.empty ? r2KeyQuery.docs[0].data() : null,
        docId: !r2KeyQuery.empty ? r2KeyQuery.docs[0].id : null,
        collection: "uploads",
        queryField: "r2Key",
      }
    } catch (error) {
      console.error(`❌ [Debug] Error in alternative searches:`, error)
      results.errors.push(`alternativeSearches: ${error}`)
    }

    // Determine the best result
    let bestResult = null
    let bestSource = ""

    if (results.searchResults.uploads?.exists) {
      bestResult = results.searchResults.uploads.data
      bestSource = "uploads"
    } else if (results.searchResults.originalUpload?.exists) {
      bestResult = results.searchResults.originalUpload.data
      bestSource = "uploads (via productBoxContent)"
    } else if (results.searchResults.productBoxContent?.exists) {
      bestResult = results.searchResults.productBoxContent.data
      bestSource = "productBoxContent"
    } else if (results.searchResults.creatorUploads?.exists) {
      bestResult = results.searchResults.creatorUploads.data
      bestSource = "creatorUploads"
    } else if (results.searchResults.uploadsByFilename?.exists) {
      bestResult = results.searchResults.uploadsByFilename.data
      bestSource = "uploads (by filename)"
    } else if (results.searchResults.uploadsByR2Key?.exists) {
      bestResult = results.searchResults.uploadsByR2Key.data
      bestSource = "uploads (by r2Key)"
    }

    if (bestResult) {
      console.log(`✅ [Debug] Best result found in: ${bestSource}`)

      // Extract the key fields we need
      const extractedData = {
        id: contentId,
        title: bestResult.title || bestResult.filename || bestResult.originalFileName || bestResult.name || "Untitled",
        filename: bestResult.filename || bestResult.originalFileName || bestResult.name || `${contentId}.file`,
        fileUrl: bestResult.fileUrl || bestResult.publicUrl || bestResult.downloadUrl || "",
        publicUrl: bestResult.publicUrl || bestResult.fileUrl || bestResult.downloadUrl || "",
        thumbnailUrl: bestResult.thumbnailUrl || bestResult.previewUrl || "",
        mimeType: bestResult.mimeType || bestResult.fileType || "application/octet-stream",
        fileSize: bestResult.fileSize || bestResult.size || 0,
        duration: bestResult.duration || bestResult.videoDuration || 0,
        type: bestResult.type || "unknown",
        creatorId: bestResult.creatorId || bestResult.userId || "",
        source: bestSource,
      }

      results.finalResult = extractedData

      console.log(`📊 [Debug] Extracted data:`, extractedData)
    } else {
      console.log(`❌ [Debug] No valid data found for content ID: ${contentId}`)
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        contentId,
        found: !!bestResult,
        source: bestSource,
        hasTitle: !!(bestResult?.title || bestResult?.filename),
        hasFileUrl: !!(bestResult?.fileUrl || bestResult?.publicUrl),
        hasThumbnail: !!bestResult?.thumbnailUrl,
        errorCount: results.errors.length,
      },
    })
  } catch (error) {
    console.error("❌ [Bundle Content Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to debug content lookup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
