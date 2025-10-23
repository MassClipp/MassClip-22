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
    const bundleId = params.id

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    console.log(`📦 [Buyer ZIP Download] Starting ZIP creation for bundle: ${bundleId}`)

    const body = await request.json()
    const { sessionId } = body

    let userUid: string | null = null
    let purchaseDoc: any = null

    // Try to authenticate with Firebase token first (for logged-in users)
    const authHeader = request.headers.get("Authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]
      try {
        const decodedToken = await auth.verifyIdToken(token)
        userUid = decodedToken.uid
        console.log(`👤 [Buyer ZIP Download] Authenticated user: ${userUid}`)
      } catch (error) {
        console.log(`⚠️ [Buyer ZIP Download] Token verification failed, will try sessionId`)
      }
    }

    // If authenticated, find purchase by user ID
    if (userUid) {
      const purchasesQuery = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userUid)
        .where("bundleId", "==", bundleId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!purchasesQuery.empty) {
        purchaseDoc = purchasesQuery.docs[0]
        console.log(`✅ [Buyer ZIP Download] Found purchase for authenticated user`)
      }
    }

    // If not found via auth, try sessionId (for non-authenticated users)
    if (!purchaseDoc && sessionId) {
      console.log(`🔍 [Buyer ZIP Download] Looking up purchase by sessionId: ${sessionId}`)
      const sessionPurchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

      if (sessionPurchaseDoc.exists) {
        const purchaseData = sessionPurchaseDoc.data()
        if (purchaseData?.bundleId === bundleId && purchaseData?.status === "completed") {
          purchaseDoc = sessionPurchaseDoc
          console.log(`✅ [Buyer ZIP Download] Found purchase via sessionId`)
        }
      }
    }

    // If still no purchase found, deny access
    if (!purchaseDoc) {
      return NextResponse.json({ error: "Purchase not found or you don't have access to this bundle" }, { status: 403 })
    }

    const purchaseData = purchaseDoc.data()
    const bundleContent = purchaseData.bundleContent || []

    if (bundleContent.length === 0) {
      return NextResponse.json({ error: "No content found in this purchase" }, { status: 404 })
    }

    console.log(`📦 [Buyer ZIP Download] Found ${bundleContent.length} content items`)

    // Create ZIP file
    const zip = new JSZip()
    let successCount = 0

    // Download and add each file to ZIP
    for (let i = 0; i < bundleContent.length; i++) {
      const item = bundleContent[i]
      const fileUrl = item.fileUrl || item.url || item.publicUrl || item.downloadUrl

      if (!fileUrl) {
        console.log(`⚠️ [Buyer ZIP Download] No URL for item ${i + 1}`)
        continue
      }

      try {
        console.log(`⬇️ [Buyer ZIP Download] Downloading file ${i + 1}/${bundleContent.length}: ${item.title}`)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          console.error(`❌ [Buyer ZIP Download] Failed to download ${item.title}`)
          continue
        }

        const arrayBuffer = await response.arrayBuffer()
        const cleanFilename = (item.title || `file-${i + 1}`).replace(/[^\w\s.-]/gi, "")
        const fileType = item.fileType || item.type || "mp4"
        const filenameWithExt = cleanFilename.includes(".") ? cleanFilename : `${cleanFilename}.${fileType}`

        zip.file(filenameWithExt, arrayBuffer)
        successCount++
        console.log(`✅ [Buyer ZIP Download] Added to ZIP: ${filenameWithExt}`)
      } catch (error) {
        console.error(`❌ [Buyer ZIP Download] Error adding ${item.title} to ZIP:`, error)
      }
    }

    if (successCount === 0) {
      return NextResponse.json({ error: "Failed to download any files" }, { status: 500 })
    }

    // Generate ZIP
    console.log(`📦 [Buyer ZIP Download] Generating ZIP file with ${successCount} files`)
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    console.log(`✅ [Buyer ZIP Download] ZIP created successfully, size: ${zipBuffer.length} bytes`)

    // Get bundle title for filename
    const bundleRef = await db.collection("bundles").doc(bundleId).get()
    const bundleTitle = bundleRef.exists ? bundleRef.data()?.title || "bundle" : "bundle"
    const cleanBundleTitle = bundleTitle.replace(/[^\w\s-]/gi, "")
    const zipFilename = `${cleanBundleTitle}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("❌ [Buyer ZIP Download] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to create ZIP file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
