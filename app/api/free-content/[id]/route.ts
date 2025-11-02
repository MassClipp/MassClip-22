import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const contentId = params.id

    console.log("🔍 [Free Content] Removing content:", contentId)

    // Verify ownership and delete
    const doc = await db.collection("free_content").doc(contentId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const data = doc.data()
    if (data?.uid !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await db.collection("free_content").doc(contentId).delete()

    console.log("✅ [Free Content] Removed content:", contentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ [Free Content] Error removing content:", error)
    return NextResponse.json({ error: "Failed to remove content" }, { status: 500 })
  }
}
