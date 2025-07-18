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
    console.error("❌ [Find User Uploads] Firebase Admin initialization error:", error)
  }
}

const db = getFirestore()

async function getUserInfo(request: NextRequest): Promise<{ userId: string | null; email: string | null }> {
  const headersList = headers()
  const authorization = headersList.get("authorization")

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return { userId: null, email: null }
  }

  const token = authorization.split("Bearer ")[1]
  const auth = getAuth()
  try {
    const decodedToken = await auth.verifyIdToken(token)
    return { userId: decodedToken.uid, email: decodedToken.email || null }
  } catch (error) {
    console.error("❌ [Find User Uploads] Token verification failed, proceeding without user context")
    return { userId: null, email: null }
  }
}

export async function GET(request: NextRequest) {
  console.log("🚀 [Find User Uploads] Starting comprehensive search")

  try {
    const { userId, email } = await getUserInfo(request)

    if (!userId) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
    }

    console.log("🔍 [Find User Uploads] Searching for user:", userId)

    const results = {
      userId,
      userEmail: email,
      collectionsFound: [],
      allCollections: [],
      userDocuments: [],
      potentialMatches: [],
    }

    // First, let's list all collections in the database
    try {
      const collections = await db.listCollections()
      results.allCollections = collections.map((col) => col.id)
      console.log("📋 [Find User Uploads] All collections:", results.allCollections)
    } catch (error) {
      console.log("⚠️ [Find User Uploads] Could not list collections:", error.message)
    }

    // Define all possible collections and field combinations
    const searchTargets = [
      // Common upload collections
      { collection: "uploads", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "userUploads", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "creatorUploads", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "files", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "content", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "media", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "videos", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },
      { collection: "assets", fields: ["uid", "userId", "creatorId", "ownerId", "uploadedBy"] },

      // User-specific collections
      { collection: `users/${userId}/uploads`, fields: ["uid", "userId", "creatorId"] },
      { collection: `users/${userId}/files`, fields: ["uid", "userId", "creatorId"] },
      { collection: `users/${userId}/content`, fields: ["uid", "userId", "creatorId"] },

      // Other possible structures
      { collection: "user_uploads", fields: ["uid", "userId", "creatorId", "ownerId"] },
      { collection: "user_files", fields: ["uid", "userId", "creatorId", "ownerId"] },
      { collection: "user_content", fields: ["uid", "userId", "creatorId", "ownerId"] },
    ]

    // Search through each target
    for (const target of searchTargets) {
      try {
        console.log(`🔍 [Find User Uploads] Checking collection: ${target.collection}`)

        // First check if collection exists by getting a sample document
        const collectionRef = db.collection(target.collection)
        const sampleSnapshot = await collectionRef.limit(1).get()

        if (sampleSnapshot.empty) {
          console.log(`📭 [Find User Uploads] Collection ${target.collection} is empty or doesn't exist`)
          continue
        }

        results.collectionsFound.push(target.collection)

        // Get a few sample documents to understand the structure
        const sampleDocs = await collectionRef.limit(5).get()
        const sampleData = sampleDocs.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
          fields: Object.keys(doc.data()),
        }))

        console.log(`📄 [Find User Uploads] Sample docs from ${target.collection}:`, sampleData)

        // Try each field for this user
        for (const field of target.fields) {
          try {
            const userQuery = collectionRef.where(field, "==", userId).limit(10)
            const userSnapshot = await userQuery.get()

            if (!userSnapshot.empty) {
              console.log(
                `🎯 [Find User Uploads] FOUND ${userSnapshot.size} documents in ${target.collection}.${field}`,
              )

              const documents = userSnapshot.docs.map((doc) => ({
                id: doc.id,
                collection: target.collection,
                field: field,
                data: doc.data(),
              }))

              results.userDocuments.push(...documents)
            }
          } catch (queryError) {
            console.log(`⚠️ [Find User Uploads] Query error for ${target.collection}.${field}:`, queryError.message)
          }
        }

        // Also try searching by email if available
        if (email) {
          try {
            const emailQuery = collectionRef.where("email", "==", email).limit(5)
            const emailSnapshot = await emailQuery.get()

            if (!emailSnapshot.empty) {
              console.log(
                `📧 [Find User Uploads] Found ${emailSnapshot.size} documents by email in ${target.collection}`,
              )

              const emailDocs = emailSnapshot.docs.map((doc) => ({
                id: doc.id,
                collection: target.collection,
                field: "email",
                data: doc.data(),
              }))

              results.potentialMatches.push(...emailDocs)
            }
          } catch (emailError) {
            // Ignore email query errors
          }
        }
      } catch (collectionError) {
        console.log(`❌ [Find User Uploads] Error with collection ${target.collection}:`, collectionError.message)
      }
    }

    // If we still haven't found anything, let's do a broader search
    if (results.userDocuments.length === 0) {
      console.log("🔍 [Find User Uploads] No direct matches found, doing broader search...")

      for (const collectionName of results.collectionsFound) {
        try {
          const collectionRef = db.collection(collectionName)
          const allDocs = await collectionRef.limit(20).get()

          console.log(`📊 [Find User Uploads] Analyzing ${allDocs.size} documents from ${collectionName}`)

          allDocs.docs.forEach((doc) => {
            const data = doc.data()

            // Look for any field that might contain our user ID
            Object.entries(data).forEach(([key, value]) => {
              if (value === userId || value === email) {
                console.log(`🔍 [Find User Uploads] Potential match in ${collectionName}.${doc.id}.${key}: ${value}`)
                results.potentialMatches.push({
                  id: doc.id,
                  collection: collectionName,
                  field: key,
                  data: data,
                })
              }
            })
          })
        } catch (error) {
          console.log(`❌ [Find User Uploads] Broader search error for ${collectionName}:`, error.message)
        }
      }
    }

    console.log("✅ [Find User Uploads] Search complete")
    console.log(`📊 [Find User Uploads] Found ${results.userDocuments.length} user documents`)
    console.log(`📊 [Find User Uploads] Found ${results.potentialMatches.length} potential matches`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalCollections: results.allCollections.length,
        collectionsWithData: results.collectionsFound.length,
        userDocuments: results.userDocuments.length,
        potentialMatches: results.potentialMatches.length,
      },
    })
  } catch (error) {
    console.error("❌ [Find User Uploads] Unexpected error:", error)

    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
