import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("🔍 [Debug Free Content] Checking for user:", userId)

    // Get all free content for this user
    const freeContentSnapshot = await db.collection("free_content").where("uid", "==", userId).get()

    const freeContentItems = freeContentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Get all uploads for comparison
    const uploadsSnapshot = await db.collection("uploads").where("uid", "==", userId).get()
    const uploadsItems = uploadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`🔍 [Debug Free Content] Found ${freeContentItems.length} free content items`)
    console.log(`🔍 [Debug Free Content] Found ${uploadsItems.length} upload items`)

    return NextResponse.json({
      success: true,
      userId,
      freeContent: {
        totalItems: freeContentItems.length,
        items: freeContentItems,
      },
      uploads: {
        totalItems: uploadsItems.length,
        items: uploadsItems.map((item) => ({
          id: item.id,
          title: item.title,
          filename: item.filename,
          fileUrl: item.fileUrl,
        })),
      },
      debug: {
        freeContentIds: freeContentItems.map((item) => item.originalId || item.id),
        uploadIds: uploadsItems.map((item) => item.id),
      },
    })
  } catch (error) {
    console.error("❌ [Debug Free Content] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to debug free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
