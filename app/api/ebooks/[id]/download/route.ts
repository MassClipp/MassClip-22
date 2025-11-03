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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ebookId = params.id

    if (!ebookId) {
      return NextResponse.json({ error: "eBook ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log(`📚 [eBook Download] Starting download for eBook: ${ebookId}`)

    // Get the authorization header (optional for buyers)
    const authHeader = request.headers.get("Authorization")
    let userUid = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]
      try {
        const decodedToken = await auth.verifyIdToken(token)
        userUid = decodedToken.uid
        console.log(`👤 [eBook Download] User UID: ${userUid}`)
      } catch (error) {
        console.log("⚠️ [eBook Download] Token verification failed, continuing without auth")
      }
    }

    // Verify purchase access
    const purchaseQuery = await db
      .collection("ebookPurchases")
      .where("ebookId", "==", ebookId)
      .where("sessionId", "==", sessionId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (purchaseQuery.empty) {
      return NextResponse.json({ error: "Purchase not found or not completed" }, { status: 404 })
    }

    console.log(`✅ [eBook Download] Purchase verified, fetching eBook`)

    // Get eBook document
    const ebookRef = await db.collection("ebooks").doc(ebookId).get()

    if (!ebookRef.exists) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    const ebookData = ebookRef.data()
    const pages = ebookData.pages || []
    const coverUrl = ebookData.coverUrl || ""

    if (pages.length === 0 && !coverUrl) {
      return NextResponse.json({ error: "No pages found in eBook" }, { status: 404 })
    }

    console.log(`📚 [eBook Download] Found ${pages.length} pages + cover`)

    // Normalize pages to handle both string[] and object[] formats
    const normalizePages = (pages: any[]): string[] => {
      return pages
        .map((page) => {
          if (typeof page === "string") {
            return page
          }
          if (typeof page === "object" && page.url) {
            return page.url
          }
          return ""
        })
        .filter(Boolean)
    }

    const pageUrls = normalizePages(pages)
    const allUrls = coverUrl ? [coverUrl, ...pageUrls] : pageUrls

    console.log(`📦 [eBook Download] Creating ZIP with ${allUrls.length} images`)

    // Create ZIP file
    const zip = new JSZip()

    // Download and add each page to ZIP
    for (let i = 0; i < allUrls.length; i++) {
      const url = allUrls[i]
      const isCover = i === 0 && coverUrl
      const pageNumber = isCover ? "cover" : i.toString().padStart(3, "0")

      try {
        console.log(`⬇️ [eBook Download] Downloading ${isCover ? "cover" : `page ${i}`}`)

        const response = await fetch(url)
        if (!response.ok) {
          console.error(`❌ [eBook Download] Failed to download ${isCover ? "cover" : `page ${i}`}`)
          continue
        }

        const arrayBuffer = await response.arrayBuffer()

        // Extract file extension from URL
        const urlMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/)
        const extension = urlMatch && urlMatch[1] ? urlMatch[1].toLowerCase() : "jpg"

        const filename = isCover ? `cover.${extension}` : `page-${pageNumber}.${extension}`

        zip.file(filename, arrayBuffer)
        console.log(`✅ [eBook Download] Added to ZIP: ${filename}`)
      } catch (error) {
        console.error(`❌ [eBook Download] Error adding ${isCover ? "cover" : `page ${i}`} to ZIP:`, error)
      }
    }

    // Generate ZIP
    console.log(`📦 [eBook Download] Generating ZIP file`)
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    console.log(`✅ [eBook Download] ZIP created successfully, size: ${zipBuffer.length} bytes`)

    // Return ZIP file
    const ebookTitle = ebookData.title || "ebook"
    const cleanTitle = ebookTitle.replace(/[^\w\s-]/gi, "")
    const zipFilename = `${cleanTitle}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("❌ [eBook Download] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create ZIP file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
