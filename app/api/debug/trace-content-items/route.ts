import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getProductBoxId(request: NextRequest): Promise<string | null> {
  const { searchParams } = new URL(request.url)
  return searchParams.get("productBoxId")
}

export async function GET(request: NextRequest) {
  try {
    const productBoxId = await getProductBoxId(request)

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Content Tracer] Tracing content items for: ${productBoxId}`)

    const trace = {
      productBoxId,
      timestamp: new Date().toISOString(),
      productBox: null,
      contentItems: [],
      missingItems: [],
      foundCollections: {},
    }

    // 1. Get the product box document
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    trace.productBox = productBoxData

    console.log(`📋 Product box data:`, {
      title: productBoxData.title,
      creatorId: productBoxData.creatorId,
      contentItems: productBoxData.contentItems?.length || 0,
    })

    // 2. Trace each content item ID
    if (productBoxData.contentItems && Array.isArray(productBoxData.contentItems)) {
      console.log(`🔍 Tracing ${productBoxData.contentItems.length} content items...`)

      for (const itemId of productBoxData.contentItems) {
        console.log(`\n🔍 Tracing item: ${itemId}`)

        const itemTrace = {
          id: itemId,
          found: false,
          collection: null,
          data: null,
          publicUrl: null,
          downloadUrl: null,
          fileType: null,
          category: null,
        }

        // Check multiple collections where this content might exist
        const collectionsToCheck = ["uploads", "content", "files", "media", "videos", "creatorUploads", "userUploads"]

        for (const collectionName of collectionsToCheck) {
          try {
            const doc = await db.collection(collectionName).doc(itemId).get()

            if (doc.exists) {
              const data = doc.data()!
              itemTrace.found = true
              itemTrace.collection = collectionName
              itemTrace.data = data
              itemTrace.publicUrl = data.publicUrl || data.url || data.downloadUrl
              itemTrace.downloadUrl = data.downloadUrl || data.publicUrl || data.url
              itemTrace.fileType = data.fileType || data.mimeType || data.type
              itemTrace.category = data.category || data.type

              console.log(`✅ Found in ${collectionName}:`, {
                fileName: data.fileName || data.originalFileName,
                publicUrl: itemTrace.publicUrl,
                fileType: itemTrace.fileType,
                category: itemTrace.category,
              })

              // Track which collections have content
              if (!trace.foundCollections[collectionName]) {
                trace.foundCollections[collectionName] = 0
              }
              trace.foundCollections[collectionName]++

              break
            }
          } catch (error) {
            console.error(`Error checking ${collectionName}:`, error)
          }
        }

        if (itemTrace.found) {
          trace.contentItems.push(itemTrace)
        } else {
          console.log(`❌ Item ${itemId} not found in any collection`)
          trace.missingItems.push(itemId)
        }
      }
    }

    // 3. Check if creator has any uploads at all
    if (productBoxData.creatorId) {
      console.log(`\n👤 Checking creator uploads for: ${productBoxData.creatorId}`)

      try {
        const creatorUploadsSnapshot = await db
          .collection("uploads")
          .where("creatorId", "==", productBoxData.creatorId)
          .limit(10)
          .get()

        console.log(`📁 Creator has ${creatorUploadsSnapshot.size} uploads in total`)

        if (!creatorUploadsSnapshot.empty) {
          trace.foundCollections["creator_uploads_total"] = creatorUploadsSnapshot.size

          // Show sample of creator's uploads
          const sampleUploads = creatorUploadsSnapshot.docs.slice(0, 3).map((doc) => ({
            id: doc.id,
            fileName: doc.data().fileName || doc.data().originalFileName,
            publicUrl: doc.data().publicUrl,
            category: doc.data().category,
            uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString(),
          }))

          trace.foundCollections["creator_uploads_sample"] = sampleUploads
        }
      } catch (error) {
        console.error("Error checking creator uploads:", error)
      }
    }

    // 4. Generate recommendations
    const recommendations = []

    if (trace.missingItems.length > 0) {
      recommendations.push(`${trace.missingItems.length} content items are missing from all collections`)
    }

    if (trace.contentItems.length === 0 && trace.foundCollections["creator_uploads_total"] > 0) {
      recommendations.push("Creator has uploads but none are linked to this product box")
      recommendations.push("Consider updating contentItems array with valid upload IDs")
    }

    if (trace.contentItems.some((item) => !item.publicUrl)) {
      recommendations.push("Some content items are missing publicUrl/downloadUrl fields")
    }

    return NextResponse.json({
      ...trace,
      summary: {
        totalContentItems: productBoxData.contentItems?.length || 0,
        foundItems: trace.contentItems.length,
        missingItems: trace.missingItems.length,
        collectionsWithContent: Object.keys(trace.foundCollections).length,
      },
      recommendations,
    })
  } catch (error) {
    console.error("Error tracing content items:", error)
    return NextResponse.json(
      {
        error: "Failed to trace content items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
