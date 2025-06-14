import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Auth] No Bearer token found")
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      console.log("❌ [Auth] Empty token")
      return null
    }

    // Import auth here to avoid initialization issues
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    console.log("✅ [Auth] Token verified for user:", decodedToken.uid)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

// GET /api/free-content - Fetch user's free content
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Free Content API] GET request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [Free Content API] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    console.log(`🔍 [Free Content API] Fetching free content for user: ${user.uid}`)

    try {
      // Query the free_content collection
      const freeContentRef = db.collection("free_content")
      const query = freeContentRef.where("uid", "==", user.uid).limit(50)

      const snapshot = await query.get()
      console.log(`🔍 [Free Content API] Found ${snapshot.docs.length} documents`)

      // Map the documents to a more usable format
      const freeContent = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          addedAt: data.addedAt?.toDate?.() || data.addedAt,
        }
      })

      // Sort by addedAt (newest first) in JavaScript instead of Firestore
      const sortedContent = freeContent.sort((a, b) => {
        const dateA = new Date(a.addedAt || 0).getTime()
        const dateB = new Date(b.addedAt || 0).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Free Content API] Returning ${sortedContent.length} free content items`)
      return NextResponse.json({
        data: sortedContent,
        freeContent: sortedContent,
        success: true,
      })
    } catch (firestoreError) {
      console.error("❌ [Free Content API] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Free Content API] Error fetching free content:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST /api/free-content - Add uploads to free content
export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Free Content API] POST request received")

    const user = await verifyAuthToken(request)
    if (!user) {
      console.log("❌ [Free Content API] Unauthorized request")
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Valid authentication token required",
        },
        { status: 401 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ [Free Content API] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { uploadIds } = body
    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid uploadIds" }, { status: 400 })
    }

    console.log(`🔍 [Free Content API] Adding ${uploadIds.length} uploads to free content for user: ${user.uid}`)

    try {
      // Get the upload details for each ID
      const batch = db.batch()
      const addedItems = []

      for (const uploadId of uploadIds) {
        const uploadDoc = await db.collection("uploads").doc(uploadId).get()

        if (!uploadDoc.exists) {
          console.warn(`⚠️ [Free Content API] Upload ${uploadId} not found`)
          continue
        }

        const uploadData = uploadDoc.data()

        // Verify the upload belongs to the user
        if (uploadData.uid !== user.uid) {
          console.warn(`⚠️ [Free Content API] Upload ${uploadId} does not belong to user ${user.uid}`)
          continue
        }

        // Create a new free content entry
        const freeContentRef = db.collection("free_content").doc()
        const freeContentData = {
          uid: user.uid,
          uploadId,
          title: uploadData.title,
          fileUrl: uploadData.fileUrl,
          type: uploadData.type,
          addedAt: new Date(),
        }

        batch.set(freeContentRef, freeContentData)
        addedItems.push({
          id: freeContentRef.id,
          ...freeContentData,
        })
      }

      // Commit the batch
      await batch.commit()

      console.log(`✅ [Free Content API] Added ${addedItems.length} items to free content`)
      return NextResponse.json({
        success: true,
        message: `Added ${addedItems.length} items to free content`,
        addedItems,
      })
    } catch (firestoreError) {
      console.error("❌ [Free Content API] Firestore error:", firestoreError)
      return NextResponse.json(
        {
          error: "Database error",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Free Content API] Error adding to free content:", error)
    return NextResponse.json(
      {
        error: "Failed to add to free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
