import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    console.log(`🔍 DIAGNOSTIC: Checking all content for creator: ${creatorId}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const results: any = {
      creatorId,
      timestamp: new Date().toISOString(),
      collections: {},
    }

    // Check all possible collections
    const collectionsToCheck = ["free_content", "uploads", "creator_uploads", "videos", "content"]

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`📁 Checking collection: ${collectionName}`)
        const collectionRef = db.collection(collectionName)

        // Try different field names
        const fieldsToTry = ["uid", "creatorId", "userId", "user_id", "creator_id"]

        for (const field of fieldsToTry) {
          try {
            const snapshot = await collectionRef.where(field, "==", creatorId).get()

            if (!snapshot.empty) {
              results.collections[`${collectionName}_${field}`] = {
                totalDocs: snapshot.size,
                docs: snapshot.docs.map((doc) => ({
                  id: doc.id,
                  data: doc.data(),
                })),
              }
              console.log(`✅ Found ${snapshot.size} docs in ${collectionName} with field ${field}`)
            }
          } catch (fieldError) {
            console.log(`❌ Error querying ${collectionName} with field ${field}:`, fieldError)
          }
        }
      } catch (collectionError) {
        console.log(`❌ Error accessing collection ${collectionName}:`, collectionError)
        results.collections[`${collectionName}_error`] = collectionError
      }
    }

    // Check user subcollections
    try {
      console.log(`📁 Checking user subcollections for: ${creatorId}`)
      const userSubcollections = ["uploads", "videos", "content", "free_content"]

      for (const subcollection of userSubcollections) {
        try {
          const subcollectionRef = db.collection(`users/${creatorId}/${subcollection}`)
          const snapshot = await subcollectionRef.get()

          if (!snapshot.empty) {
            results.collections[`users_${creatorId}_${subcollection}`] = {
              totalDocs: snapshot.size,
              docs: snapshot.docs.map((doc) => ({
                id: doc.id,
                data: doc.data(),
              })),
            }
            console.log(`✅ Found ${snapshot.size} docs in users/${creatorId}/${subcollection}`)
          }
        } catch (subError) {
          console.log(`❌ Error checking users/${creatorId}/${subcollection}:`, subError)
        }
      }
    } catch (userError) {
      console.log(`❌ Error checking user subcollections:`, userError)
    }

    // Check if user document exists
    try {
      const userDoc = await db.collection("users").doc(creatorId).get()
      results.userDocument = {
        exists: userDoc.exists,
        data: userDoc.exists ? userDoc.data() : null,
      }
    } catch (userDocError) {
      results.userDocumentError = userDocError
    }

    // Check creators collection
    try {
      const creatorDoc = await db.collection("creators").doc(creatorId).get()
      results.creatorDocument = {
        exists: creatorDoc.exists,
        data: creatorDoc.exists ? creatorDoc.data() : null,
      }
    } catch (creatorDocError) {
      results.creatorDocumentError = creatorDocError
    }

    console.log(`📊 DIAGNOSTIC COMPLETE for ${creatorId}`)
    console.log("🐛 Full results:", JSON.stringify(results, null, 2))

    return NextResponse.json(results)
  } catch (error) {
    console.error("❌ Diagnostic error:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
