import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🧹 [Cleanup] Starting product box content cleanup")

    const cleanupResults = {
      processedBundles: 0,
      deletedEntries: 0,
      skippedEntries: 0,
      errors: 0,
      details: [] as string[],
    }

    // Get all bundles
    const bundlesSnapshot = await db.collection("bundles").get()
    console.log(`📦 [Cleanup] Found ${bundlesSnapshot.size} bundles to process`)

    for (const bundleDoc of bundlesSnapshot.docs) {
      const bundleData = bundleDoc.data()
      const bundleId = bundleDoc.id
      const validContentItems = bundleData.contentItems || []

      console.log(`🔍 [Cleanup] Processing bundle: ${bundleId} with ${validContentItems.length} valid content items`)

      try {
        // Get all productBoxContent entries for this bundle
        const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", bundleId).get()

        console.log(`📄 [Cleanup] Found ${contentQuery.size} productBoxContent entries for bundle ${bundleId}`)

        for (const contentDoc of contentQuery.docs) {
          const contentData = contentDoc.data()
          const uploadId = contentData.uploadId

          // Check if this upload ID is still in the bundle's contentItems array
          if (!validContentItems.includes(uploadId)) {
            // This is orphaned content - delete it
            await contentDoc.ref.delete()
            cleanupResults.deletedEntries++
            cleanupResults.details.push(
              `Deleted orphaned content: ${contentData.title || "Untitled"} (ID: ${contentDoc.id}) from bundle ${bundleId}`,
            )
            console.log(`🗑️ [Cleanup] Deleted orphaned content: ${contentDoc.id} from bundle ${bundleId}`)
          } else {
            cleanupResults.skippedEntries++
            console.log(`✅ [Cleanup] Kept valid content: ${contentDoc.id} in bundle ${bundleId}`)
          }
        }

        cleanupResults.processedBundles++
      } catch (bundleError) {
        console.error(`❌ [Cleanup] Error processing bundle ${bundleId}:`, bundleError)
        cleanupResults.errors++
        cleanupResults.details.push(`Error processing bundle ${bundleId}: ${bundleError}`)
      }
    }

    // Also clean up productBoxContent entries that reference non-existent bundles
    console.log("🔍 [Cleanup] Checking for orphaned productBoxContent entries...")

    const allContentSnapshot = await db.collection("productBoxContent").get()
    const bundleIds = new Set(bundlesSnapshot.docs.map((doc) => doc.id))

    for (const contentDoc of allContentSnapshot.docs) {
      const contentData = contentDoc.data()
      const productBoxId = contentData.productBoxId

      if (!bundleIds.has(productBoxId)) {
        // This content references a non-existent bundle
        await contentDoc.ref.delete()
        cleanupResults.deletedEntries++
        cleanupResults.details.push(
          `Deleted content referencing non-existent bundle: ${contentData.title || "Untitled"} (Bundle ID: ${productBoxId})`,
        )
        console.log(`🗑️ [Cleanup] Deleted content referencing non-existent bundle: ${contentDoc.id}`)
      }
    }

    console.log("✅ [Cleanup] Cleanup completed", cleanupResults)

    return NextResponse.json({
      success: true,
      message: "Product box content cleanup completed",
      results: cleanupResults,
    })
  } catch (error) {
    console.error("❌ [Cleanup] Error during cleanup:", error)
    return NextResponse.json(
      {
        error: "Failed to cleanup product box content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Cleanup] Analyzing product box content for cleanup")

    const analysisResults = {
      totalBundles: 0,
      totalContentEntries: 0,
      orphanedEntries: 0,
      validEntries: 0,
      bundlesWithOrphanedContent: [] as string[],
      orphanedDetails: [] as any[],
    }

    // Get all bundles
    const bundlesSnapshot = await db.collection("bundles").get()
    analysisResults.totalBundles = bundlesSnapshot.size

    const bundleIds = new Set(bundlesSnapshot.docs.map((doc) => doc.id))

    // Get all productBoxContent entries
    const allContentSnapshot = await db.collection("productBoxContent").get()
    analysisResults.totalContentEntries = allContentSnapshot.size

    for (const contentDoc of allContentSnapshot.docs) {
      const contentData = contentDoc.data()
      const productBoxId = contentData.productBoxId
      const uploadId = contentData.uploadId

      // Check if bundle exists
      if (!bundleIds.has(productBoxId)) {
        analysisResults.orphanedEntries++
        analysisResults.orphanedDetails.push({
          contentId: contentDoc.id,
          title: contentData.title || "Untitled",
          bundleId: productBoxId,
          reason: "Bundle does not exist",
        })
        continue
      }

      // Check if upload is still in bundle's contentItems
      const bundleDoc = bundlesSnapshot.docs.find((doc) => doc.id === productBoxId)
      if (bundleDoc) {
        const bundleData = bundleDoc.data()
        const validContentItems = bundleData.contentItems || []

        if (!validContentItems.includes(uploadId)) {
          analysisResults.orphanedEntries++
          if (!analysisResults.bundlesWithOrphanedContent.includes(productBoxId)) {
            analysisResults.bundlesWithOrphanedContent.push(productBoxId)
          }
          analysisResults.orphanedDetails.push({
            contentId: contentDoc.id,
            title: contentData.title || "Untitled",
            bundleId: productBoxId,
            uploadId: uploadId,
            reason: "Upload not in bundle's contentItems array",
          })
        } else {
          analysisResults.validEntries++
        }
      }
    }

    console.log("📊 [Cleanup] Analysis completed", analysisResults)

    return NextResponse.json({
      success: true,
      analysis: analysisResults,
    })
  } catch (error) {
    console.error("❌ [Cleanup] Error during analysis:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze product box content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
