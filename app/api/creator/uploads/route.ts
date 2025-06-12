import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import { getAuth } from "firebase-admin/auth"
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

    // Check if db is properly initialized
    if (!db) {
      console.error("❌ [Creator Uploads] Firestore db not initialized")
      return NextResponse.json({ error: "Database connection error" }, { status: 500 })
    }

    console.log("🔍 [Creator Uploads] Querying uploads for user:", userId)

    // Try different collection names and user field variations
    const searchConfigs = [
      // Most likely collections and field names based on the codebase
      { collection: "uploads", userField: "uid" },
      { collection: "uploads", userField: "userId" },
      { collection: "uploads", userField: "creatorId" },
      { collection: "userUploads", userField: "uid" },
      { collection: "userUploads", userField: "userId" },
      { collection: "creatorUploads", userField: "uid" },
      { collection: "creatorUploads", userField: "userId" },
      { collection: "creatorUploads", userField: "creatorId" },
      { collection: "files", userField: "uid" },
      { collection: "files", userField: "userId" },
      { collection: "content", userField: "uid" },
      { collection: "content", userField: "userId" },
      { collection: "content", userField: "creatorId" },
    ]

    const uploads: any[] = []
    let successfulConfig = null

    for (const config of searchConfigs) {
      try {
        console.log(`🔍 [Creator Uploads] Trying collection: ${config.collection} with field: ${config.userField}`)

        const uploadsQuery = query(
          collection(db, config.collection),
          where(config.userField, "==", userId),
          orderBy("createdAt", "desc"),
          limit(50),
        )

        const uploadsSnapshot = await getDocs(uploadsQuery)

        if (!uploadsSnapshot.empty) {
          console.log(
            `✅ [Creator Uploads] Found ${uploadsSnapshot.size} documents in ${config.collection} using ${config.userField}`,
          )
          successfulConfig = config

          uploadsSnapshot.forEach((doc) => {
            const data = doc.data()
            console.log(`📄 [Creator Uploads] Document ${doc.id}:`, {
              title: data.title,
              filename: data.filename,
              fileUrl: data.fileUrl,
              mimeType: data.mimeType,
              [config.userField]: data[config.userField],
            })

            uploads.push({
              id: doc.id,
              title: data.title || data.filename || data.originalFileName || data.name || "Untitled",
              filename: data.filename || data.originalFileName || data.name || `${doc.id}.file`,
              fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl || data.url || "",
              thumbnailUrl: data.thumbnailUrl || data.thumbnail || "",
              mimeType: data.mimeType || data.fileType || data.contentType || "application/octet-stream",
              fileSize: data.fileSize || data.size || 0,
              duration: data.duration || undefined,
              createdAt: data.createdAt || data.uploadedAt || data.timestamp,
              contentType: getContentType(data.mimeType || data.fileType || data.contentType || ""),
              // Include all original data for debugging
              _originalData: data,
            })
          })
          break
        } else {
          console.log(`📭 [Creator Uploads] No documents found in ${config.collection} with ${config.userField}`)
        }
      } catch (collectionError) {
        console.log(
          `⚠️ [Creator Uploads] Error querying ${config.collection} with ${config.userField}:`,
          collectionError.message,
        )
        continue
      }
    }

    // If no uploads found, try to find ANY documents for this user in any collection
    if (uploads.length === 0) {
      console.log("🔍 [Creator Uploads] No uploads found, trying broader search...")

      const broadSearchCollections = ["uploads", "userUploads", "creatorUploads", "files", "content"]

      for (const collectionName of broadSearchCollections) {
        try {
          // Try without ordering first to see if there are any documents at all
          const allDocsQuery = query(collection(db, collectionName), limit(10))
          const allDocsSnapshot = await getDocs(allDocsQuery)

          console.log(`📊 [Creator Uploads] Total documents in ${collectionName} collection: ${allDocsSnapshot.size}`)

          if (!allDocsSnapshot.empty) {
            console.log(`📄 [Creator Uploads] Sample documents from ${collectionName}:`)
            allDocsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
              const data = doc.data()
              console.log(`  Document ${index + 1}:`, {
                id: doc.id,
                uid: data.uid,
                userId: data.userId,
                creatorId: data.creatorId,
                title: data.title,
                filename: data.filename,
                fileUrl: data.fileUrl,
                hasCreatedAt: !!data.createdAt,
              })
            })

            // Try to find documents that might belong to this user with different field names
            const userVariations = [userId, decodedToken.email, decodedToken.firebase?.identities?.email?.[0]]

            for (const userVar of userVariations) {
              if (!userVar) continue

              for (const field of ["uid", "userId", "creatorId", "email"]) {
                try {
                  const userQuery = query(collection(db, collectionName), where(field, "==", userVar), limit(5))
                  const userSnapshot = await getDocs(userQuery)

                  if (!userSnapshot.empty) {
                    console.log(
                      `🎯 [Creator Uploads] Found ${userSnapshot.size} documents for user ${userVar} in ${collectionName}.${field}`,
                    )
                  }
                } catch (queryError) {
                  // Ignore query errors for non-indexed fields
                }
              }
            }
          }
        } catch (broadSearchError) {
          console.error(`❌ [Creator Uploads] Broad search error for ${collectionName}:`, broadSearchError)
        }
      }
    }

    console.log(
      `✅ [Creator Uploads] Returning ${uploads.length} uploads from config: ${JSON.stringify(successfulConfig)}`,
    )

    return NextResponse.json({
      success: true,
      uploads,
      count: uploads.length,
      configUsed: successfulConfig,
      userId: userId,
      userEmail: decodedToken.email,
      debug: {
        searchConfigsChecked: searchConfigs.length,
        successfulConfig,
        totalFound: uploads.length,
      },
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Unexpected error:", error)
    console.error("❌ [Creator Uploads] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
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
