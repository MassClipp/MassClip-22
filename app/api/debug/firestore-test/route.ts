import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Firestore Test] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const { collection: collectionName, action, userId: targetUserId } = await request.json()

    console.log(`🔍 [Firestore Test] Collection: ${collectionName}, Action: ${action}, User: ${userId}`)

    if (action === "list" && collectionName === "productBoxes") {
      try {
        // Test basic Firestore connection
        const testQuery = db
          .collection("productBoxes")
          .where("creatorId", "==", targetUserId || userId)
          .limit(10)
        const snapshot = await testQuery.get()

        const results = {
          connectionWorking: true,
          queryExecuted: true,
          documentsFound: snapshot.size,
          documents: snapshot.docs.map((doc) => ({
            id: doc.id,
            exists: doc.exists,
            data: doc.data(),
          })),
        }

        // Test document access methods
        if (snapshot.size > 0) {
          const firstDoc = snapshot.docs[0]
          results.firstDocumentTest = {
            id: firstDoc.id,
            existsMethod: firstDoc.exists,
            dataMethod: !!firstDoc.data(),
            refPath: firstDoc.ref.path,
          }
        }

        return NextResponse.json({
          success: true,
          data: results,
        })
      } catch (error) {
        console.error("❌ [Firestore Test] Query error:", error)
        return NextResponse.json({
          success: false,
          error: "Firestore query failed",
          details: error instanceof Error ? error.message : "Unknown error",
          errorType: error?.constructor?.name,
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: "Unknown test action",
    })
  } catch (error) {
    console.error("❌ [Firestore Test] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Firestore test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
