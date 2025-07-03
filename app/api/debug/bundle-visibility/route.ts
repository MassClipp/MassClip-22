import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")

    if (!creatorId) {
      return NextResponse.json({ error: "creatorId is required" }, { status: 400 })
    }

    console.log(`🔍 [Bundle Visibility Debug] Checking bundles for creator: ${creatorId}`)

    const report = {
      creatorId,
      bundlesCollection: [] as any[],
      productBoxesCollection: [] as any[],
      visibility: {
        totalBundles: 0,
        activeBundles: 0,
        visibleBundles: 0,
      },
      issues: [] as string[],
      timestamp: new Date().toISOString(),
    }

    // Check bundles collection
    try {
      const bundlesSnapshot = await db.collection("bundles").where("creatorId", "==", creatorId).get()

      bundlesSnapshot.forEach((doc) => {
        const data = doc.data()
        report.bundlesCollection.push({
          id: doc.id,
          title: data.title,
          active: data.active,
          creatorId: data.creatorId,
          userId: data.userId,
          hasContentItems: Array.isArray(data.contentItems) && data.contentItems.length > 0,
          createdAt: data.createdAt,
        })
      })

      console.log(`📊 [Bundle Visibility Debug] Found ${report.bundlesCollection.length} bundles in bundles collection`)
    } catch (bundlesError) {
      console.error("❌ [Bundle Visibility Debug] Error querying bundles collection:", bundlesError)
      report.issues.push(`Bundles collection error: ${bundlesError}`)
    }

    // Check productBoxes collection
    try {
      const productBoxesSnapshot = await db.collection("productBoxes").where("creatorId", "==", creatorId).get()

      productBoxesSnapshot.forEach((doc) => {
        const data = doc.data()
        report.productBoxesCollection.push({
          id: doc.id,
          title: data.title,
          active: data.active,
          creatorId: data.creatorId,
          userId: data.userId,
          hasContentItems: Array.isArray(data.contentItems) && data.contentItems.length > 0,
          createdAt: data.createdAt,
        })
      })

      console.log(
        `📊 [Bundle Visibility Debug] Found ${report.productBoxesCollection.length} bundles in productBoxes collection`,
      )
    } catch (productBoxesError) {
      console.error("❌ [Bundle Visibility Debug] Error querying productBoxes collection:", productBoxesError)
      report.issues.push(`ProductBoxes collection error: ${productBoxesError}`)
    }

    // Calculate visibility stats
    const allBundles = [...report.bundlesCollection, ...report.productBoxesCollection]
    report.visibility.totalBundles = allBundles.length
    report.visibility.activeBundles = allBundles.filter((bundle) => bundle.active === true).length
    report.visibility.visibleBundles = allBundles.filter(
      (bundle) => bundle.active === true && bundle.hasContentItems,
    ).length

    // Check for issues
    if (report.visibility.totalBundles === 0) {
      report.issues.push("No bundles found for this creator")
    }

    if (report.visibility.activeBundles > report.visibility.visibleBundles) {
      report.issues.push(
        `${report.visibility.activeBundles - report.visibility.visibleBundles} active bundles have no content items`,
      )
    }

    const duplicateBundles = allBundles.filter(
      (bundle, index, arr) => arr.findIndex((b) => b.id === bundle.id) !== index,
    )
    if (duplicateBundles.length > 0) {
      report.issues.push(`Found ${duplicateBundles.length} duplicate bundles across collections`)
    }

    console.log(`✅ [Bundle Visibility Debug] Report completed for creator ${creatorId}`)

    return NextResponse.json(report)
  } catch (error) {
    console.error("❌ [Bundle Visibility Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate bundle visibility report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creatorId, action } = body

    if (!creatorId) {
      return NextResponse.json({ error: "creatorId is required" }, { status: 400 })
    }

    console.log(`🔧 [Bundle Visibility Debug] Performing action: ${action} for creator: ${creatorId}`)

    const result = {
      action,
      creatorId,
      changes: [] as string[],
      errors: [] as string[],
      timestamp: new Date().toISOString(),
    }

    if (action === "sync_collections") {
      // Sync bundles from bundles collection to productBoxes collection
      try {
        const bundlesSnapshot = await db.collection("bundles").where("creatorId", "==", creatorId).get()

        for (const bundleDoc of bundlesSnapshot.docs) {
          const bundleData = bundleDoc.data()

          // Check if it exists in productBoxes
          const productBoxDoc = await db.collection("productBoxes").doc(bundleDoc.id).get()

          if (!productBoxDoc.exists) {
            // Create in productBoxes collection
            await db
              .collection("productBoxes")
              .doc(bundleDoc.id)
              .set({
                ...bundleData,
                updatedAt: new Date(),
              })
            result.changes.push(`Created productBox ${bundleDoc.id} from bundle`)
          } else {
            // Update existing productBox
            await db
              .collection("productBoxes")
              .doc(bundleDoc.id)
              .update({
                title: bundleData.title,
                description: bundleData.description,
                price: bundleData.price,
                active: bundleData.active,
                contentItems: bundleData.contentItems || [],
                updatedAt: new Date(),
              })
            result.changes.push(`Updated productBox ${bundleDoc.id} from bundle`)
          }
        }
      } catch (syncError) {
        console.error("❌ [Bundle Visibility Debug] Sync error:", syncError)
        result.errors.push(`Sync error: ${syncError}`)
      }
    }

    console.log(`✅ [Bundle Visibility Debug] Action completed: ${action}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ [Bundle Visibility Debug] Action error:", error)
    return NextResponse.json(
      {
        error: "Failed to perform action",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
