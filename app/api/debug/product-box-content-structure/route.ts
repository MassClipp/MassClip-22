import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productBoxId = searchParams.get("productBoxId")

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Content Structure] Analyzing product box: ${productBoxId}`)

    const analysis = {
      productBoxId,
      timestamp: new Date().toISOString(),
      collections: {},
      recommendations: [],
      issues: [],
    }

    // 1. Check main product box document
    console.log("📋 Checking main product box document...")
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      // Try alternative collection names
      const alternativeCollections = ["product-boxes", "products", "premiumContent", "premium-content"]
      let found = false

      for (const collectionName of alternativeCollections) {
        const altDoc = await db.collection(collectionName).doc(productBoxId).get()
        if (altDoc.exists) {
          analysis.collections[collectionName] = {
            exists: true,
            data: altDoc.data(),
          }
          found = true
          break
        }
      }

      if (!found) {
        analysis.issues.push("Product box document not found in any collection")
        return NextResponse.json(analysis)
      }
    } else {
      analysis.collections["productBoxes"] = {
        exists: true,
        data: productBoxDoc.data(),
      }
    }

    const productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

    // 2. Check contents subcollection
    console.log("📁 Checking contents subcollection...")
    const contentsSnapshot = await productBoxRef.collection("contents").get()
    analysis.collections["contents_subcollection"] = {
      exists: !contentsSnapshot.empty,
      count: contentsSnapshot.size,
      documents: contentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      })),
    }

    // 3. Check productBoxContent collection
    console.log("📦 Checking productBoxContent collection...")
    const productBoxContentSnapshot = await db
      .collection("productBoxContent")
      .where("productBoxId", "==", productBoxId)
      .get()

    analysis.collections["productBoxContent"] = {
      exists: !productBoxContentSnapshot.empty,
      count: productBoxContentSnapshot.size,
      documents: productBoxContentSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      })),
    }

    // 4. Check contentItems array in product box
    if (productBoxData?.contentItems) {
      console.log("🔗 Checking contentItems references...")
      const contentItemsData = []

      for (const itemId of productBoxData.contentItems) {
        try {
          const uploadDoc = await db.collection("uploads").doc(itemId).get()
          if (uploadDoc.exists) {
            contentItemsData.push({
              id: itemId,
              data: uploadDoc.data(),
              collection: "uploads",
            })
          } else {
            // Try other collections
            const contentDoc = await db.collection("content").doc(itemId).get()
            if (contentDoc.exists) {
              contentItemsData.push({
                id: itemId,
                data: contentDoc.data(),
                collection: "content",
              })
            }
          }
        } catch (error) {
          console.error(`Error fetching content item ${itemId}:`, error)
        }
      }

      analysis.collections["contentItems_references"] = {
        exists: contentItemsData.length > 0,
        count: contentItemsData.length,
        documents: contentItemsData,
      }
    }

    // 5. Check uploads collection for creator content
    if (productBoxData?.creatorId) {
      console.log("👤 Checking creator uploads...")
      const creatorUploadsSnapshot = await db
        .collection("uploads")
        .where("creatorId", "==", productBoxData.creatorId)
        .limit(10)
        .get()

      analysis.collections["creator_uploads"] = {
        exists: !creatorUploadsSnapshot.empty,
        count: creatorUploadsSnapshot.size,
        documents: creatorUploadsSnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        })),
      }
    }

    // Generate recommendations
    if (analysis.collections["contents_subcollection"]?.count === 0) {
      analysis.recommendations.push("Create contents subcollection with proper content documents")
    }

    if (analysis.collections["productBoxContent"]?.count === 0) {
      analysis.recommendations.push("Sync content to productBoxContent collection")
    }

    if (productBoxData?.contentItems?.length > 0 && analysis.collections["contentItems_references"]?.count === 0) {
      analysis.recommendations.push("Fix broken contentItems references")
    }

    // Check for missing required fields
    const requiredFields = ["title", "fileUrl", "mimeType", "size"]
    const contentSources = [
      analysis.collections["contents_subcollection"]?.documents || [],
      analysis.collections["productBoxContent"]?.documents || [],
      analysis.collections["contentItems_references"]?.documents || [],
    ]

    for (const source of contentSources) {
      for (const doc of source) {
        const missingFields = requiredFields.filter((field) => !doc.data[field])
        if (missingFields.length > 0) {
          analysis.issues.push(`Document ${doc.id} missing fields: ${missingFields.join(", ")}`)
        }
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing content structure:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze content structure",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
