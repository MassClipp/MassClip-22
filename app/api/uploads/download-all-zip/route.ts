import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import JSZip from "jszip"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)
    const uid = decodedToken.uid

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")
    const search = searchParams.get("search")
    const folderId = searchParams.get("folder")

    // Build Firestore query
    let query = db.collection("uploads").where("uid", "==", uid)

    if (type && type !== "all") {
      query = query.where("type", "==", type)
    }

    if (folderId) {
      query = query.where("folderId", "==", folderId)
    } else {
      query = query.where("folderId", "==", null)
    }

    const snapshot = await query.get()

    if (snapshot.empty) {
      return NextResponse.json({ error: "No uploads found" }, { status: 404 })
    }

    let uploads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase()
      uploads = uploads.filter(
        (upload: any) =>
          upload.title?.toLowerCase().includes(searchLower) || upload.filename?.toLowerCase().includes(searchLower),
      )
    }

    if (uploads.length === 0) {
      return NextResponse.json({ error: "No uploads match the filters" }, { status: 404 })
    }

    // Create ZIP file
    const zip = new JSZip()

    // Download each file and add to ZIP
    for (const upload of uploads) {
      try {
        const response = await fetch(upload.fileUrl)
        if (response.ok) {
          const blob = await response.blob()
          const arrayBuffer = await blob.arrayBuffer()
          zip.file(upload.filename, arrayBuffer)
        }
      } catch (error) {
        console.error(`Failed to download file ${upload.filename}:`, error)
        // Continue with other files even if one fails
      }
    }

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: "nodebuffer" })

    // Return ZIP file
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="uploads-${Date.now()}.zip"`,
      },
    })
  } catch (error: any) {
    console.error("Error creating ZIP:", error)
    return NextResponse.json({ error: error.message || "Failed to create ZIP file" }, { status: 500 })
  }
}
