import { type NextRequest, NextResponse } from "next/server"
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId } = body

    if (!contentId) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Content Lookup] Searching for content ID: ${contentId}`)

    const results: any = {
      contentId,
      searchResults: {},
      foundData: null,
      recommendations: [],
    }

    // 1. Check uploads collection by document ID
    try {
      const uploadsDoc = await db.collection("uploads").doc(contentId).get()
      if (uploadsDoc.exists) {
        const data = uploadsDoc.data()
        results.searchResults.uploadsById = {
          found: true,
          data: {
            title: data?.title,
            filename: data?.filename,
            url: data?.url,
            fileType: data?.fileType,
            size: data?.size || data?.fileSize,
            createdAt: data?.createdAt,
            userId: data?.userId,
          },
        }
        results.foundData = data
      } else {
        results.searchResults.uploadsById = { found: false }
      }
    } catch (error) {
      results.searchResults.uploadsById = { found: false, error: error.message }
    }

    // 2. Check uploads collection by id field
    try {
      const uploadsQuery = await db.collection("uploads").where("id", "==", contentId).limit(1).get()
      if (!uploadsQuery.empty) {
        const data = uploadsQuery.docs[0].data()
        results.searchResults.uploadsByIdField = {
          found: true,
          docId: uploadsQuery.docs[0].id,
          data: {
            title: data?.title,
            filename: data?.filename,
            url: data?.url,
            fileType: data?.fileType,
            size: data?.size || data?.fileSize,
            createdAt: data?.createdAt,
            userId: data?.userId,
          },
        }
        if (!results.foundData) results.foundData = data
      } else {
        results.searchResults.uploadsByIdField = { found: false }
      }
    } catch (error) {
      results.searchResults.uploadsByIdField = { found: false, error: error.message }
    }

    // 3. Check productBoxContent collection
    try {
      const productBoxContentDoc = await db.collection("productBoxContent").doc(contentId).get()
      if (productBoxContentDoc.exists) {
        const data = productBoxContentDoc.data()
        results.searchResults.productBoxContent = {
          found: true,
          data: {
            title: data?.title,
            filename: data?.filename,
            uploadId: data?.uploadId,
            fileUrl: data?.fileUrl,
            createdAt: data?.createdAt,
          },
        }

        // If there's an uploadId, try to get the original upload
        if (data?.uploadId) {
          try {
            const originalUpload = await db.collection("uploads").doc(data.uploadId).get()
            if (originalUpload.exists) {
              const originalData = originalUpload.data()
              results.searchResults.originalUploadViaProductBox = {
                found: true,
                uploadId: data.uploadId,
                data: {
                  title: originalData?.title,
                  filename: originalData?.filename,
                  url: originalData?.url,
                  fileType: originalData?.fileType,
                  size: originalData?.size || originalData?.fileSize,
                },
              }
              if (!results.foundData) results.foundData = originalData
            }
          } catch (error) {
            results.searchResults.originalUploadViaProductBox = { found: false, error: error.message }
          }
        }
      } else {
        results.searchResults.productBoxContent = { found: false }
      }
    } catch (error) {
      results.searchResults.productBoxContent = { found: false, error: error.message }
    }

    // 4. Check creatorUploads collection
    try {
      const creatorUploadsQuery = await db.collection("creatorUploads").where("id", "==", contentId).limit(1).get()
      if (!creatorUploadsQuery.empty) {
        const data = creatorUploadsQuery.docs[0].data()
        results.searchResults.creatorUploads = {
          found: true,
          docId: creatorUploadsQuery.docs[0].id,
          data: {
            title: data?.title,
            filename: data?.filename,
            url: data?.url,
            fileType: data?.fileType,
            size: data?.size || data?.fileSize,
            createdAt: data?.createdAt,
            userId: data?.userId,
          },
        }
        if (!results.foundData) results.foundData = data
      } else {
        results.searchResults.creatorUploads = { found: false }
      }
    } catch (error) {
      results.searchResults.creatorUploads = { found: false, error: error.message }
    }

    // 5. Search for similar IDs in uploads collection (partial matches)
    try {
      const uploadsSnapshot = await db.collection("uploads").limit(10).get()
      const similarIds: any[] = []

      uploadsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (doc.id.includes(contentId.substring(0, 8)) || (data.id && data.id.includes(contentId.substring(0, 8)))) {
          similarIds.push({
            docId: doc.id,
            dataId: data.id,
            title: data.title,
            filename: data.filename,
          })
        }
      })

      results.searchResults.similarIds = similarIds
    } catch (error) {
      results.searchResults.similarIds = { error: error.message }
    }

    // Generate recommendations
    if (!results.foundData) {
      results.recommendations.push("Content ID not found in any collection")
      results.recommendations.push("Check if the content ID is correct")
      results.recommendations.push("Verify the content exists in the uploads collection")

      if (results.searchResults.similarIds?.length > 0) {
        results.recommendations.push("Found similar IDs - check if you're using the correct ID format")
      }
    } else {
      results.recommendations.push("Content found successfully")

      if (!results.foundData.url && !results.foundData.fileUrl) {
        results.recommendations.push("Warning: No file URL found in the content data")
      }

      if (!results.foundData.title && !results.foundData.filename) {
        results.recommendations.push("Warning: No title or filename found in the content data")
      }
    }

    console.log(`✅ [Content Lookup] Search completed for: ${contentId}`)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error("❌ [Content Lookup] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to lookup content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
