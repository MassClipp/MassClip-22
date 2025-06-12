import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Firebase Admin initialization error:", error)
  }
}

const db = getFirestore()

export async function GET(request: NextRequest) {
  console.log("🚀 [Creator Uploads] API route called")

  try {
    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.log("❌ [Creator Uploads] No valid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]
    console.log("🔑 [Creator Uploads] Token received, length:", token?.length)

    // Verify the Firebase token
    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Creator Uploads] Token verified for user:", decodedToken.uid)
    } catch (tokenError) {
      console.error("❌ [Creator Uploads] Token verification failed:", tokenError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Define all possible collection and field combinations to try
    const searchConfigs = [
      // Standard collections
      { collection: "uploads", userField: "uid" },
      { collection: "uploads", userField: "userId" },
      { collection: "uploads", userField: "creatorId" },
      { collection: "userUploads", userField: "uid" },
      { collection: "userUploads", userField: "userId" },
      { collection: "creatorUploads", userField: "uid" },
      { collection: "creatorUploads", userField: "userId" },

      // User subcollections
      { collection: `users/${userId}/uploads`, userField: null },
      { collection: `users/${userId}/files`, userField: null },
      { collection: `users/${userId}/content`, userField: null },

      // Other possible collections
      { collection: "files", userField: "uid" },
      { collection: "files", userField: "userId" },
      { collection: "content", userField: "uid" },
      { collection: "content", userField: "userId" },
      { collection: "media", userField: "uid" },
      { collection: "media", userField: "userId" },
    ]

    const uploads = []
    let successfulConfig = null

    // Try each collection and field combination
    for (const config of searchConfigs) {
      try {
        console.log(`🔍 [Creator Uploads] Trying collection: ${config.collection}`)

        let querySnapshot

        if (config.userField) {
          // Query with user field filter
          const collectionRef = db.collection(config.collection)
          querySnapshot = await collectionRef.where(config.userField, "==", userId).get()
        } else {
          // Direct subcollection query (no filter needed)
          const collectionRef = db.collection(config.collection)
          querySnapshot = await collectionRef.get()
        }

        if (!querySnapshot.empty) {
          console.log(`✅ [Creator Uploads] Found ${querySnapshot.size} documents in ${config.collection}`)
          successfulConfig = config

          // Process each document
          querySnapshot.forEach((doc) => {
            const data = doc.data()

            // Only include published uploads if that's a requirement
            // if (data.status !== 'published') continue;

            uploads.push({
              id: doc.id,
              title: data.title || data.filename || data.name || "Untitled",
              filename: data.filename || data.name || `${doc.id}.file`,
              fileUrl: data.fileUrl || data.url || data.downloadUrl || "",
              thumbnailUrl: data.thumbnailUrl || data.thumbnail || "",
              mimeType: data.mimeType || data.fileType || data.contentType || "application/octet-stream",
              fileSize: data.fileSize || data.size || 0,
              duration: data.duration,
              contentType: getContentType(data.mimeType || data.fileType || data.contentType || ""),
              createdAt: data.createdAt || data.uploadedAt || data.timestamp || new Date().toISOString(),
            })
          })

          // If we found uploads, no need to check other collections
          if (uploads.length > 0) {
            break
          }
        }
      } catch (error) {
        console.error(`❌ [Creator Uploads] Error with ${config.collection}:`, error.message)
        // Continue to next collection
      }
    }

    // If we still haven't found uploads, try one more approach with user email
    if (uploads.length === 0 && decodedToken.email) {
      try {
        console.log(`🔍 [Creator Uploads] Trying to find uploads by email: ${decodedToken.email}`)

        const collections = ["uploads", "userUploads", "creatorUploads", "files", "content"]

        for (const collectionName of collections) {
          try {
            const collectionRef = db.collection(collectionName)
            const emailQuery = await collectionRef.where("email", "==", decodedToken.email).get()

            if (!emailQuery.empty) {
              console.log(`✅ [Creator Uploads] Found ${emailQuery.size} documents by email in ${collectionName}`)

              emailQuery.forEach((doc) => {
                const data = doc.data()
                uploads.push({
                  id: doc.id,
                  title: data.title || data.filename || data.name || "Untitled",
                  filename: data.filename || data.name || `${doc.id}.file`,
                  fileUrl: data.fileUrl || data.url || data.downloadUrl || "",
                  thumbnailUrl: data.thumbnailUrl || data.thumbnail || "",
                  mimeType: data.mimeType || data.fileType || data.contentType || "application/octet-stream",
                  fileSize: data.fileSize || data.size || 0,
                  duration: data.duration,
                  contentType: getContentType(data.mimeType || data.fileType || data.contentType || ""),
                  createdAt: data.createdAt || data.uploadedAt || data.timestamp || new Date().toISOString(),
                })
              })

              if (uploads.length > 0) {
                successfulConfig = { collection: collectionName, userField: "email" }
                break
              }
            }
          } catch (error) {
            console.error(`❌ [Creator Uploads] Error with email query in ${collectionName}:`, error.message)
          }
        }
      } catch (error) {
        console.error("❌ [Creator Uploads] Error with email search:", error.message)
      }
    }

    // Filter out uploads without valid URLs
    const validUploads = uploads.filter((upload) => upload.fileUrl && upload.fileUrl.startsWith("http"))

    console.log(`✅ [Creator Uploads] Returning ${validUploads.length} uploads`)

    return NextResponse.json({
      success: true,
      uploads: validUploads,
      count: validUploads.length,
      configUsed: successfulConfig,
      userId: userId,
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Unexpected error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper function to determine content type
function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (!mimeType) return "document"

  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
