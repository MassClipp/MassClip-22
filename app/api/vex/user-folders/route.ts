import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      return null
    }

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [Vex Folders] Fetching folders for user: ${user.uid}`)

    const foldersSnapshot = await db
      .collection("folders")
      .where("userId", "==", user.uid)
      .where("isDeleted", "==", false)
      .get()

    const folders = []

    // Add "Main" folder as default
    folders.push({
      id: "main",
      name: "Main",
      description: "Default folder for uploads",
      path: "/Main",
      isDefault: true,
      fileCount: 0,
    })

    // Process user folders
    const userFolders = []
    for (const doc of foldersSnapshot.docs) {
      const folderData = doc.data()

      // Count files in this folder
      const uploadsSnapshot = await db
        .collection("uploads")
        .where("uid", "==", user.uid)
        .where("folderId", "==", doc.id)
        .get()

      userFolders.push({
        id: doc.id,
        name: folderData.name,
        description: folderData.description || `Content folder: ${folderData.name}`,
        path: folderData.path || `/${folderData.name}`,
        parentId: folderData.parentId || null,
        fileCount: uploadsSnapshot.size,
        createdAt: folderData.createdAt?.toDate?.() || new Date(folderData.createdAt),
        isDefault: false,
      })
    }

    // Sort by createdAt in memory
    userFolders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    folders.push(...userFolders)

    // Count files in Main folder (files without folderId)
    const mainUploadsSnapshot = await db
      .collection("uploads")
      .where("uid", "==", user.uid)
      .where("folderId", "==", null)
      .get()

    folders[0].fileCount = mainUploadsSnapshot.size

    console.log(`✅ [Vex Folders] Found ${folders.length} folders for user`)

    return NextResponse.json({
      success: true,
      folders,
      summary: {
        totalFolders: folders.length,
        totalFiles: folders.reduce((sum, folder) => sum + folder.fileCount, 0),
      },
    })
  } catch (error) {
    console.error("❌ [Vex Folders] Error fetching folders:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
