import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import JSZip from "jszip"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id

    if (!productBoxId) {
      return NextResponse.json({ error: "Product Box ID is required" }, { status: 400 })
    }

    console.log(`📦 [ZIP Download] Starting ZIP creation for product box: ${productBoxId}`)

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
      console.error("❌ [ZIP Download] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid
    console.log(`👤 [ZIP Download] User UID: ${userUid}`)

    // Verify user has access to this product box
    let hasAccess = false
    let productBoxTitle = "product-box"
    let contentItems = []

    // Check bundlePurchases first
    const bundlePurchaseQuery = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userUid)
      .where("bundleId", "==", productBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    if (!bundlePurchaseQuery.empty) {
      hasAccess = true
      const purchaseData = bundlePurchaseQuery.docs[0].data()
      productBoxTitle = purchaseData.bundleTitle || purchaseData.productBoxTitle || "product-box"

      // Get content from purchase record
      if (purchaseData.contents && Array.isArray(purchaseData.contents)) {
        contentItems = purchaseData.contents
      }
      console.log(`✅ [ZIP Download] Access verified via bundlePurchases`)
    }

    // Check productBoxPurchases as fallback
    if (!hasAccess) {
      const productBoxPurchaseQuery = await db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", userUid)
        .where("productBoxId", "==", productBoxId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!productBoxPurchaseQuery.empty) {
        hasAccess = true
        const purchaseData = productBoxPurchaseQuery.docs[0].data()
        productBoxTitle = purchaseData.productBoxTitle || "product-box"
        console.log(`✅ [ZIP Download] Access verified via productBoxPurchases`)
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have access to this product box" }, { status: 403 })
    }

    // If no content items from purchase, fetch from productBoxContent collection
    if (contentItems.length === 0) {
      console.log(`🔍 [ZIP Download] Fetching content from productBoxContent collection`)
      const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

      contentItems = contentQuery.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || data.filename || "Untitled",
          fileUrl: data.fileUrl || data.downloadUrl || data.url,
          filename: data.filename || data.title || "download",
          fileType: data.fileType || "mp4",
        }
      })
    }

    if (contentItems.length === 0) {
      return NextResponse.json({ error: "No content found in product box" }, { status: 404 })
    }

    console.log(`📦 [ZIP Download] Found ${contentItems.length} content items`)

    // Create ZIP file
    const zip = new JSZip()

    // Download and add each file to ZIP
    for (let i = 0; i < contentItems.length; i++) {
      const item = contentItems[i]
      const fileUrl = item.fileUrl || item.downloadUrl || item.url
      const title = item.title || item.filename || `file-${i + 1}`

      if (!fileUrl) {
        console.log(`⚠️ [ZIP Download] Skipping item ${i + 1}: no file URL`)
        continue
      }

      try {
        console.log(`⬇️ [ZIP Download] Downloading file ${i + 1}/${contentItems.length}: ${title}`)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          console.error(`❌ [ZIP Download] Failed to download ${title}`)
          continue
        }

        const arrayBuffer = await response.arrayBuffer()
        const cleanFilename = title.replace(/[^\w\s.-]/gi, "")
        const fileType = item.fileType || item.mimeType?.split("/")[1] || "mp4"
        const filenameWithExt = cleanFilename.includes(".") ? cleanFilename : `${cleanFilename}.${fileType}`

        zip.file(filenameWithExt, arrayBuffer)
        console.log(`✅ [ZIP Download] Added to ZIP: ${filenameWithExt}`)
      } catch (error) {
        console.error(`❌ [ZIP Download] Error adding ${title} to ZIP:`, error)
      }
    }

    // Generate ZIP
    console.log(`📦 [ZIP Download] Generating ZIP file`)
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    console.log(`✅ [ZIP Download] ZIP created successfully, size: ${zipBuffer.length} bytes`)

    // Return ZIP file
    const cleanTitle = productBoxTitle.replace(/[^\w\s-]/gi, "")
    const zipFilename = `${cleanTitle}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("❌ [ZIP Download] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create ZIP file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
