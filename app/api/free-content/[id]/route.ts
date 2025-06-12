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

// DELETE /api/free-content/[id] - Remove item from free content
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log(`🔍 [Free Content API] DELETE request received for ID: ${id}`)

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

    console.log(`🔍 [Free Content API] Removing item ${id} from free content for user: ${user.uid}`)

    try {
      // Get the free content item
      const freeContentRef = db.collection("free_content").doc(id)
      const freeContentDoc = await freeContentRef.get()

      if (!freeContentDoc.exists) {
        console.warn(`⚠️ [Free Content API] Free content item ${id} not found`)
        return NextResponse.json({ error: "Item not found" }, { status: 404 })
      }

      const freeContentData = freeContentDoc.data()

      // Verify the item belongs to the user
      if (freeContentData.uid !== user.uid) {
        console.warn(`⚠️ [Free Content API] Free content item ${id} does not belong to user ${user.uid}`)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Delete the item
      await freeContentRef.delete()

      console.log(`✅ [Free Content API] Removed item ${id} from free content`)
      return NextResponse.json({
        success: true,
        message: "Item removed from free content",
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
    console.error("❌ [Free Content API] Error removing from free content:", error)
    return NextResponse.json(
      {
        error: "Failed to remove from free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
