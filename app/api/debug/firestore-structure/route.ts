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
    console.error("❌ [Firestore Structure] Firebase Admin initialization error:", error)
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

  // Verify the Firebase token
  const auth = getAuth()
  try {
    const decodedToken = await auth.verifyIdToken(token)
    return { userId: decodedToken.uid, email: decodedToken.email || null }
  } catch (error) {
    console.error("❌ [Firestore Structure] Token verification failed:", error)
    return { userId: null, email: null }
  }
}

export async function GET(request: NextRequest) {
  console.log("🚀 [Firestore Structure] API route called")

  try {
    const { userId, email } = await getUserInfo(request)

    if (!userId) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    console.log("✅ [Firestore Structure] Token verified for user:", userId)

    // Get all collections
    const collections = await db.listCollections()
    const collectionIds = collections.map((col) => col.id)

    console.log("📚 [Firestore Structure] Found collections:", collectionIds)

    // Sample data from each collection
    const collectionData = {}

    for (const collectionId of collectionIds) {
      try {
        const collectionRef = db.collection(collectionId)
        const snapshot = await collectionRef.limit(3).get()

        if (!snapshot.empty) {
          // Get sample document structure
          const sampleDoc = snapshot.docs[0].data()
          const fields = Object.keys(sampleDoc)

          collectionData[collectionId] = {
            documentCount: snapshot.size,
            sampleFields: fields,
            hasUserIdField: fields.includes("uid") || fields.includes("userId") || fields.includes("creatorId"),
            hasEmailField: fields.includes("email"),
          }

          // Check if this collection has documents for this user
          let userDocuments = 0

          // Try common user ID fields
          for (const field of ["uid", "userId", "creatorId", "ownerId"]) {
            if (fields.includes(field)) {
              try {
                const userQuery = collectionRef.where(field, "==", userId).limit(10)
                const userSnapshot = await userQuery.get()
                userDocuments += userSnapshot.size
              } catch (error) {
                // Ignore query errors
              }
            }
          }

          // Try email field
          if (fields.includes("email") && email) {
            try {
              const emailQuery = collectionRef.where("email", "==", email).limit(10)
              const emailSnapshot = await emailQuery.get()
              userDocuments += emailSnapshot.size
            } catch (error) {
              // Ignore query errors
            }
          }

          collectionData[collectionId].userDocuments = userDocuments
        } else {
          collectionData[collectionId] = { documentCount: 0, empty: true }
        }
      } catch (error) {
        console.error(`❌ [Firestore Structure] Error with collection ${collectionId}:`, error.message)
        collectionData[collectionId] = { error: error.message }
      }
    }

    // Check for user subcollections
    const userSubcollections = {}

    try {
      const userDocRef = db.doc(`users/${userId}`)
      const userSubcols = await userDocRef.listCollections()

      for (const subcol of userSubcols) {
        const snapshot = await subcol.limit(5).get()
        userSubcollections[subcol.id] = {
          documentCount: snapshot.size,
          empty: snapshot.empty,
        }

        if (!snapshot.empty) {
          const sampleDoc = snapshot.docs[0].data()
          userSubcollections[subcol.id].sampleFields = Object.keys(sampleDoc)
        }
      }
    } catch (error) {
      console.error(`❌ [Firestore Structure] Error checking user subcollections:`, error.message)
    }

    return NextResponse.json({
      success: true,
      userId,
      userEmail: email,
      collections: collectionIds,
      collectionData,
      userSubcollections,
      summary: {
        totalCollections: collectionIds.length,
        collectionsWithUserData: Object.values(collectionData).filter((c) => c.userDocuments > 0).length,
      },
    })
  } catch (error) {
    console.error("❌ [Firestore Structure] Unexpected error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze Firestore structure",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
