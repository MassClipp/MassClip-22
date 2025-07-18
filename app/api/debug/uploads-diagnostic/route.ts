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
    console.error("❌ [Uploads Diagnostic] Firebase Admin initialization error:", error)
  }
}

const db = getFirestore()

async function getUserInfo(request: NextRequest): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  try {
    const token = authorization.split("Bearer ")[1]
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken.uid
  } catch (tokenError) {
    console.log("⚠️ [Uploads Diagnostic] Token verification failed, proceeding without user context")
    return null
  }
}

export async function GET(request: NextRequest) {
  console.log("🚀 [Uploads Diagnostic] Starting diagnostic")

  try {
    const userId = await getUserInfo(request)

    const diagnostic = {
      timestamp: new Date().toISOString(),
      userId,
      collections: {},
      totalDocuments: 0,
      userDocuments: 0,
    }

    // Check common collection names
    const collectionsToCheck = [
      "uploads",
      "userUploads",
      "creatorUploads",
      "files",
      "content",
      "videos",
      "media",
      "assets",
    ]

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`🔍 [Uploads Diagnostic] Checking collection: ${collectionName}`)

        const collectionRef = db.collection(collectionName)
        const snapshot = await collectionRef.limit(10).get()

        const collectionInfo = {
          exists: !snapshot.empty,
          documentCount: snapshot.size,
          sampleDocuments: [],
          userDocuments: 0,
        }

        if (!snapshot.empty) {
          diagnostic.totalDocuments += snapshot.size

          // Get sample documents
          snapshot.docs.forEach((doc, index) => {
            if (index < 3) {
              // Only first 3 for sample
              const data = doc.data()
              collectionInfo.sampleDocuments.push({
                id: doc.id,
                fields: Object.keys(data),
                uid: data.uid,
                userId: data.userId,
                creatorId: data.creatorId,
                title: data.title,
                filename: data.filename,
                fileUrl: data.fileUrl,
                hasCreatedAt: !!data.createdAt,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
              })
            }

            // Check if this document belongs to the current user
            if (
              userId &&
              (doc.data().uid === userId || doc.data().userId === userId || doc.data().creatorId === userId)
            ) {
              collectionInfo.userDocuments++
              diagnostic.userDocuments++
            }
          })
        }

        diagnostic.collections[collectionName] = collectionInfo
        console.log(
          `📊 [Uploads Diagnostic] ${collectionName}: ${collectionInfo.documentCount} docs, ${collectionInfo.userDocuments} user docs`,
        )
      } catch (error) {
        console.error(`❌ [Uploads Diagnostic] Error checking ${collectionName}:`, error)
        diagnostic.collections[collectionName] = {
          exists: false,
          error: error.message,
        }
      }
    }

    // If we have a user, try to find their documents with different query approaches
    if (userId) {
      console.log("🔍 [Uploads Diagnostic] Searching for user-specific documents...")

      for (const collectionName of collectionsToCheck) {
        if (diagnostic.collections[collectionName]?.exists) {
          const userFields = ["uid", "userId", "creatorId"]

          for (const field of userFields) {
            try {
              const userQuery = db.collection(collectionName).where(field, "==", userId).limit(5)
              const userSnapshot = await userQuery.get()

              if (!userSnapshot.empty) {
                console.log(
                  `🎯 [Uploads Diagnostic] Found ${userSnapshot.size} documents for user in ${collectionName}.${field}`,
                )

                if (!diagnostic.collections[collectionName].userQueries) {
                  diagnostic.collections[collectionName].userQueries = {}
                }

                diagnostic.collections[collectionName].userQueries[field] = {
                  count: userSnapshot.size,
                  documents: userSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    data: doc.data(),
                  })),
                }
              }
            } catch (queryError) {
              console.log(`⚠️ [Uploads Diagnostic] Query error for ${collectionName}.${field}:`, queryError.message)
            }
          }
        }
      }
    }

    console.log("✅ [Uploads Diagnostic] Diagnostic complete")

    return NextResponse.json({
      success: true,
      diagnostic,
      summary: {
        totalCollections: Object.keys(diagnostic.collections).length,
        collectionsWithData: Object.values(diagnostic.collections).filter((c) => c.exists).length,
        totalDocuments: diagnostic.totalDocuments,
        userDocuments: diagnostic.userDocuments,
      },
    })
  } catch (error) {
    console.error("❌ [Uploads Diagnostic] Unexpected error:", error)

    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
