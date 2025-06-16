import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Fix Thumbnails] POST request received")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("✅ [Fix Thumbnails] User authenticated:", userId)

    // Find all video uploads without thumbnailUrl
    const uploadsSnapshot = await db.collection("uploads").where("uid", "==", userId).where("type", "==", "video").get()

    const uploadsToFix: any[] = []

    uploadsSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (!data.thumbnailUrl || data.thumbnailUrl === null) {
        uploadsToFix.push({
          id: doc.id,
          ...data,
        })
      }
    })

    console.log(`🔍 [Fix Thumbnails] Found ${uploadsToFix.length} uploads without thumbnails`)

    if (uploadsToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No uploads need thumbnail fixes",
        fixed: 0,
      })
    }

    // Update uploads with placeholder thumbnails
    const batch = db.batch()
    let fixedCount = 0

    for (const upload of uploadsToFix) {
      try {
        const placeholderThumbnail = `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(upload.filename || upload.title || "video")}`

        const uploadRef = db.collection("uploads").doc(upload.id)
        batch.update(uploadRef, {
          thumbnailUrl: placeholderThumbnail,
          updatedAt: new Date(),
        })

        fixedCount++
        console.log(`✅ [Fix Thumbnails] Prepared fix for: ${upload.title}`)
      } catch (error) {
        console.error(`❌ [Fix Thumbnails] Error preparing fix for ${upload.id}:`, error)
      }
    }

    if (fixedCount > 0) {
      await batch.commit()
      console.log(`✅ [Fix Thumbnails] Successfully fixed ${fixedCount} uploads`)
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} uploads with missing thumbnails`,
      fixed: fixedCount,
      total: uploadsToFix.length,
    })
  } catch (error) {
    console.error("❌ [Fix Thumbnails] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fix thumbnails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
