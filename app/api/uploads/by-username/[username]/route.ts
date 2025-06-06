import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// GET /api/uploads/by-username/[username] - Public endpoint to fetch uploads by username
export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { username } = params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    console.log(`🔍 [Public Uploads API] Fetching uploads for username: ${username}`)

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    try {
      // Simple query by username only
      const uploadsRef = db.collection("uploads")
      const query = uploadsRef.where("username", "==", username)

      const snapshot = await query.get()
      let uploads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      }))

      // Apply client-side sorting and filtering
      uploads = uploads.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Newest first
      })

      // Apply type filter
      if (type && type !== "all") {
        uploads = uploads.filter((upload) => upload.type === type)
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        uploads = uploads.filter(
          (upload) =>
            upload.title?.toLowerCase().includes(searchLower) || upload.filename?.toLowerCase().includes(searchLower),
        )
      }

      console.log(`✅ [Public Uploads API] Found ${uploads.length} uploads for ${username}`)

      return NextResponse.json({ uploads })
    } catch (firestoreError) {
      console.error("❌ [Public Uploads API] Firestore error:", firestoreError)
      return NextResponse.json({ error: "Database error", details: firestoreError.message }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Public Uploads API] Error fetching uploads:", error)
    return NextResponse.json({ error: "Failed to fetch uploads", details: error.message }, { status: 500 })
  }
}
