import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, sessionId } = await request.json()

    console.log("🔍 [Purchase Flow Trace] Starting trace for:", { productBoxId, sessionId })

    const traceResults = {
      productBoxExists: false,
      productBoxData: null,
      bundleExists: false,
      bundleData: null,
      contentItems: [],
      uploadData: [],
      productBoxContentData: [],
      purchaseExists: false,
      purchaseData: null,
      bundlePurchaseExists: false,
      bundlePurchaseData: null,
    }

    // 1. Check if product box exists
    try {
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (productBoxDoc.exists) {
        traceResults.productBoxExists = true
        traceResults.productBoxData = productBoxDoc.data()
        console.log("✅ [Trace] Product box found:", traceResults.productBoxData?.title)
      } else {
        console.log("❌ [Trace] Product box not found")
      }
    } catch (error) {
      console.error("❌ [Trace] Error checking product box:", error)
    }

    // 2. Check if bundle exists
    try {
      const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
      if (bundleDoc.exists) {
        traceResults.bundleExists = true
        traceResults.bundleData = bundleDoc.data()
        console.log("✅ [Trace] Bundle found:", traceResults.bundleData?.title)
      } else {
        console.log("❌ [Trace] Bundle not found")
      }
    } catch (error) {
      console.error("❌ [Trace] Error checking bundle:", error)
    }

    // 3. Get content items from the product/bundle
    const contentItemIds = traceResults.productBoxData?.contentItems || traceResults.bundleData?.contentItems || []
    traceResults.contentItems = contentItemIds
    console.log("📦 [Trace] Content item IDs:", contentItemIds)

    // 4. Check uploads collection for each content item
    for (const itemId of contentItemIds) {
      try {
        const uploadDoc = await db.collection("uploads").doc(itemId).get()
        if (uploadDoc.exists) {
          const uploadData = uploadDoc.data()
          traceResults.uploadData.push({
            id: itemId,
            title: uploadData?.title,
            filename: uploadData?.filename,
            fileUrl: uploadData?.fileUrl,
            fileSize: uploadData?.fileSize,
            mimeType: uploadData?.mimeType,
            exists: true,
          })
          console.log("✅ [Trace] Upload found:", uploadData?.title || uploadData?.filename)
        } else {
          traceResults.uploadData.push({
            id: itemId,
            exists: false,
          })
          console.log("❌ [Trace] Upload not found:", itemId)
        }
      } catch (error) {
        console.error("❌ [Trace] Error checking upload:", itemId, error)
      }
    }

    // 5. Check productBoxContent collection
    try {
      const contentQuery = db.collection("productBoxContent").where("productBoxId", "==", productBoxId)
      const contentSnapshot = await contentQuery.get()

      contentSnapshot.forEach((doc) => {
        const data = doc.data()
        traceResults.productBoxContentData.push({
          id: doc.id,
          title: data.title,
          uploadId: data.uploadId,
          fileUrl: data.fileUrl,
          exists: true,
        })
      })
      console.log("📄 [Trace] ProductBoxContent items:", traceResults.productBoxContentData.length)
    } catch (error) {
      console.error("❌ [Trace] Error checking productBoxContent:", error)
    }

    // 6. Check if purchase exists (if sessionId provided)
    if (sessionId) {
      try {
        const purchaseQuery = db.collection("purchases").where("sessionId", "==", sessionId)
        const purchaseSnapshot = await purchaseQuery.get()

        if (!purchaseSnapshot.empty) {
          traceResults.purchaseExists = true
          traceResults.purchaseData = purchaseSnapshot.docs[0].data()
          console.log("✅ [Trace] Purchase found")
        } else {
          console.log("❌ [Trace] Purchase not found")
        }
      } catch (error) {
        console.error("❌ [Trace] Error checking purchase:", error)
      }

      // 7. Check if bundle purchase exists
      try {
        const bundlePurchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()
        if (bundlePurchaseDoc.exists) {
          traceResults.bundlePurchaseExists = true
          traceResults.bundlePurchaseData = bundlePurchaseDoc.data()
          console.log("✅ [Trace] Bundle purchase found")
        } else {
          console.log("❌ [Trace] Bundle purchase not found")
        }
      } catch (error) {
        console.error("❌ [Trace] Error checking bundle purchase:", error)
      }
    }

    console.log("🔍 [Trace] Complete trace results:", traceResults)

    return NextResponse.json({
      success: true,
      trace: traceResults,
      summary: {
        productFound: traceResults.productBoxExists || traceResults.bundleExists,
        contentItemsFound: traceResults.uploadData.filter((item) => item.exists).length,
        totalContentItems: contentItemIds.length,
        purchaseFound: traceResults.purchaseExists,
        bundlePurchaseFound: traceResults.bundlePurchaseExists,
      },
    })
  } catch (error) {
    console.error("❌ [Trace] Error in trace:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
