import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    // Get Firebase auth token from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
      console.log(`✅ [Fix URLs] Token verified for user: ${decodedToken.uid}`)
    } catch (error) {
      console.log("❌ [Fix URLs] Invalid token:", error)
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 })
    }

    // Get productBoxId from request body
    const { productBoxId } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Missing productBoxId" }, { status: 400 })
    }

    console.log(`🔍 [Fix URLs] Fixing URLs for product box: ${productBoxId}`)

    // Find content items with missing URLs
    const contentRef = db.collection("productBoxContent")
    const q = contentRef.where("productBoxId", "==", productBoxId)
    const querySnapshot = await q.get()

    if (querySnapshot.empty) {
      console.log(`⚠️ [Fix URLs] No content found for product box: ${productBoxId}`)
      return NextResponse.json({
        success: false,
        error: "No content found",
        productBoxId,
      })
    }

    console.log(`✅ [Fix URLs] Found ${querySnapshot.size} content items to check`)

    // Track results
    const results = {
      total: querySnapshot.size,
      checked: 0,
      fixed: 0,
      alreadyValid: 0,
      failed: 0,
      errors: [],
    }

    // Process each content item
    const updatePromises = querySnapshot.docs.map(async (doc) => {
      try {
        results.checked++
        const data = doc.data()

        // Check if URLs already exist
        if (data.fileUrl && data.fileUrl.startsWith("http")) {
          results.alreadyValid++
          return null // Skip if already has valid URL
        }

        // Try to fix the URLs
        let fileUrl = null

        // Option 1: Use publicUrl if available
        if (data.publicUrl && data.publicUrl.startsWith("http")) {
          fileUrl = data.publicUrl
        }
        // Option 2: Use downloadUrl if available
        else if (data.downloadUrl && data.downloadUrl.startsWith("http")) {
          fileUrl = data.downloadUrl
        }
        // Option 3: Try to reconstruct from r2Key if available
        else if (data.r2Key) {
          const r2PublicUrl = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
          if (r2PublicUrl) {
            fileUrl = `${r2PublicUrl}/${data.r2Key}`
          }
        }
        // Option 4: Try to reconstruct from filename and box ID
        else if (data.filename) {
          const r2PublicUrl = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
          if (r2PublicUrl) {
            const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, "_")
            fileUrl = `${r2PublicUrl}/${productBoxId}/${sanitizedFilename}`
          }
        }

        if (fileUrl) {
          // Update the document with the fixed URL
          await doc.ref.update({
            fileUrl: fileUrl,
            publicUrl: fileUrl,
            downloadUrl: fileUrl,
            lastUpdated: new Date(),
            fixedBy: decodedToken.uid,
          })

          results.fixed++
          console.log(`✅ [Fix URLs] Fixed URLs for item ${doc.id}: ${fileUrl}`)
          return doc.id
        } else {
          results.failed++
          results.errors.push({
            id: doc.id,
            reason: "Could not determine URL from available data",
          })
          return null
        }
      } catch (error) {
        results.failed++
        results.errors.push({
          id: doc.id,
          reason: error instanceof Error ? error.message : "Unknown error",
        })
        console.error(`❌ [Fix URLs] Error fixing item ${doc.id}:`, error)
        return null
      }
    })

    await Promise.all(updatePromises.filter(Boolean))

    console.log(`✅ [Fix URLs] Completed with results:`, results)

    return NextResponse.json({
      success: true,
      results,
      productBoxId,
    })
  } catch (error) {
    console.error(`❌ [Fix URLs] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix URLs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
