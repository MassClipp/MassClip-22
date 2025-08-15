import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { adminDb, auth } from "@/lib/firebase-admin"
import { collection, getDocs, limit, query, where } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
    }

    const token = authorization.split("Bearer ")[1]

    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("🔍 [Debug] Checking content for user:", userId)

    const results: any = {
      userId,
      userEmail: decodedToken.email,
      collections: {},
      summary: {
        totalCollections: 0,
        totalDocuments: 0,
        collectionsWithUserData: [],
      },
    }

    // Check all possible collections
    const collectionsToCheck = [
      "uploads",
      "userUploads",
      "creatorUploads",
      "files",
      "content",
      "productBoxes",
      "bundles",
      "freeContent",
    ]

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`🔍 [Debug] Checking collection: ${collectionName}`)

        const allDocsQuery = query(collection(adminDb, collectionName), limit(100))
        const allDocsSnapshot = await getDocs(allDocsQuery)

        const collectionData: any = {
          totalDocuments: allDocsSnapshot.size,
          userDocuments: [],
          sampleDocuments: [],
        }

        // Get sample documents
        allDocsSnapshot.docs.slice(0, 3).forEach((doc) => {
          const data = doc.data()
          collectionData.sampleDocuments.push({
            id: doc.id,
            uid: data.uid,
            userId: data.userId,
            creatorId: data.creatorId,
            email: data.email,
            title: data.title,
            filename: data.filename,
            name: data.name,
            fileUrl: data.fileUrl,
            publicUrl: data.publicUrl,
            downloadUrl: data.downloadUrl,
            createdAt: data.createdAt ? "exists" : "missing",
          })
        })

        // Try to find user-specific documents
        const userFields = ["uid", "userId", "creatorId"]
        for (const field of userFields) {
          try {
            const userQuery = query(collection(adminDb, collectionName), where(field, "==", userId), limit(10))
            const userSnapshot = await getDocs(userQuery)

            if (!userSnapshot.empty) {
              console.log(`✅ [Debug] Found ${userSnapshot.size} user documents in ${collectionName}.${field}`)

              userSnapshot.forEach((doc) => {
                const data = doc.data()
                collectionData.userDocuments.push({
                  id: doc.id,
                  field: field,
                  title: data.title || data.filename || data.name,
                  fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl,
                  mimeType: data.mimeType || data.fileType,
                  createdAt: data.createdAt,
                  allFields: Object.keys(data),
                })
              })

              results.summary.collectionsWithUserData.push({
                collection: collectionName,
                field: field,
                count: userSnapshot.size,
              })
            }
          } catch (queryError) {
            console.log(`⚠️ [Debug] Could not query ${collectionName}.${field}:`, queryError.message)
          }
        }

        results.collections[collectionName] = collectionData
        results.summary.totalCollections++
        results.summary.totalDocuments += collectionData.totalDocuments
      } catch (collectionError) {
        console.error(`❌ [Debug] Error checking collection ${collectionName}:`, collectionError)
        results.collections[collectionName] = {
          error: collectionError.message,
        }
      }
    }

    console.log("📊 [Debug] Summary:", results.summary)

    return NextResponse.json(results)
  } catch (error) {
    console.error("❌ [Debug] Error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
