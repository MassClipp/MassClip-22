import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import JSZip from "jszip"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const auth = getAuth()
const db = getFirestore()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const folderId = params.id

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 })
    }

    console.log(`📦 [Folder ZIP] Starting ZIP creation for folder: ${folderId}`)

    // Get the authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      console.error("❌ [Folder ZIP] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid
    console.log(`👤 [Folder ZIP] User UID: ${userUid}`)

    // Get folder document
    const folderRef = await db.collection("folders").doc(folderId).get()

    if (!folderRef.exists) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    const folderData = folderRef.data()

    // Check if user owns this folder
    if (folderData.userId !== userUid) {
      return NextResponse.json({ error: "You don't have access to this folder" }, { status: 403 })
    }

    console.log(`✅ [Folder ZIP] User has access, fetching content`)

    // Get all uploads in this folder
    const uploadsSnapshot = await db
      .collection("uploads")
      .where("uid", "==", userUid)
      .where("folderId", "==", folderId)
      .get()

    if (uploadsSnapshot.empty) {
      return NextResponse.json({ error: "No files found in folder" }, { status: 404 })
    }

    console.log(`📦 [Folder ZIP] Found ${uploadsSnapshot.size} files`)

    const contentFiles = []

    for (const doc of uploadsSnapshot.docs) {
      const uploadData = doc.data()
      const fileUrl = uploadData.fileUrl || uploadData.url || uploadData.publicUrl || uploadData.downloadUrl || ""

      if (fileUrl) {
        contentFiles.push({
          url: fileUrl,
          filename: uploadData.title || uploadData.filename || uploadData.name || `file-${doc.id}`,
          fileType: uploadData.fileType || "mp4",
        })
        console.log(`✅ [Folder ZIP] Found file: ${uploadData.title || doc.id}`)
      }
    }

    if (contentFiles.length === 0) {
      return NextResponse.json({ error: "No downloadable files found" }, { status: 404 })
    }

    console.log(`📦 [Folder ZIP] Creating ZIP with ${contentFiles.length} files`)

    // Create ZIP file
    const zip = new JSZip()

    // Download and add each file to ZIP
    for (let i = 0; i < contentFiles.length; i++) {
      const file = contentFiles[i]
      try {
        console.log(`⬇️ [Folder ZIP] Downloading file ${i + 1}/${contentFiles.length}: ${file.filename}`)

        const response = await fetch(file.url)
        if (!response.ok) {
          console.error(`❌ [Folder ZIP] Failed to download ${file.filename}`)
          continue
        }

        const arrayBuffer = await response.arrayBuffer()
        const cleanFilename = file.filename.replace(/[^\w\s.-]/gi, "")
        const filenameWithExt = cleanFilename.includes(".")
          ? cleanFilename
          : `${cleanFilename}.${file.fileType || "mp4"}`

        zip.file(filenameWithExt, arrayBuffer)
        console.log(`✅ [Folder ZIP] Added to ZIP: ${filenameWithExt}`)
      } catch (error) {
        console.error(`❌ [Folder ZIP] Error adding ${file.filename} to ZIP:`, error)
      }
    }

    // Generate ZIP
    console.log(`📦 [Folder ZIP] Generating ZIP file`)
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    console.log(`✅ [Folder ZIP] ZIP created successfully, size: ${zipBuffer.length} bytes`)

    // Return ZIP file
    const folderName = folderData.name || "folder"
    const cleanFolderName = folderName.replace(/[^\w\s-]/gi, "")
    const zipFilename = `${cleanFolderName}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("❌ [Folder ZIP] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create ZIP file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
