import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) return null

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productBoxId = searchParams.get("productBoxId")

    if (!productBoxId) {
      return NextResponse.json({ error: "Missing productBoxId parameter" }, { status: 400 })
    }

    console.log(`🔍 [Diagnostic] Starting comprehensive search for product box: ${productBoxId}`)

    const diagnostic = {
      productBoxId,
      timestamp: new Date().toISOString(),
      searches: [] as any[],
      recommendations: [] as string[],
      summary: {
        totalItemsFound: 0,
        collectionsWithData: [] as string[],
        possibleIssues: [] as string[],
      },
    }

    // 1. Check productBoxes collection for the main document
    console.log("🔍 [Diagnostic] Checking productBoxes collection...")
    try {
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      const productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

      diagnostic.searches.push({
        collection: "productBoxes",
        query: `doc(${productBoxId})`,
        found: productBoxDoc.exists,
        data: productBoxData,
        contentItems: productBoxData?.contentItems || [],
      })

      if (productBoxDoc.exists && productBoxData?.contentItems?.length > 0) {
        diagnostic.summary.collectionsWithData.push("productBoxes.contentItems")
        diagnostic.recommendations.push(
          `Found ${productBoxData.contentItems.length} content item IDs in productBoxes.contentItems array`,
        )
      }
    } catch (error) {
      diagnostic.searches.push({
        collection: "productBoxes",
        query: `doc(${productBoxId})`,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // 2. Check productBoxContent collection with different field queries
    const productBoxContentQueries = [
      { field: "boxId", value: productBoxId },
      { field: "productBoxId", value: productBoxId },
      { field: "bundleId", value: productBoxId },
      { field: "itemId", value: productBoxId },
    ]

    for (const queryInfo of productBoxContentQueries) {
      console.log(`🔍 [Diagnostic] Checking productBoxContent where ${queryInfo.field} == ${queryInfo.value}`)
      try {
        const snapshot = await db.collection("productBoxContent").where(queryInfo.field, "==", queryInfo.value).get()

        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }))

        diagnostic.searches.push({
          collection: "productBoxContent",
          query: `where("${queryInfo.field}", "==", "${queryInfo.value}")`,
          found: !snapshot.empty,
          count: items.length,
          items: items.slice(0, 3), // Only include first 3 for brevity
        })

        if (!snapshot.empty) {
          diagnostic.summary.totalItemsFound += items.length
          diagnostic.summary.collectionsWithData.push(`productBoxContent.${queryInfo.field}`)
        }
      } catch (error) {
        diagnostic.searches.push({
          collection: "productBoxContent",
          query: `where("${queryInfo.field}", "==", "${queryInfo.value}")`,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 3. Check contents subcollection
    console.log(`🔍 [Diagnostic] Checking productBoxes/${productBoxId}/contents subcollection`)
    try {
      const contentsSnapshot = await db.collection("productBoxes").doc(productBoxId).collection("contents").get()

      const items = contentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))

      diagnostic.searches.push({
        collection: "productBoxes.contents",
        query: `productBoxes/${productBoxId}/contents`,
        found: !contentsSnapshot.empty,
        count: items.length,
        items: items.slice(0, 3),
      })

      if (!contentsSnapshot.empty) {
        diagnostic.summary.totalItemsFound += items.length
        diagnostic.summary.collectionsWithData.push("productBoxes.contents")
      }
    } catch (error) {
      diagnostic.searches.push({
        collection: "productBoxes.contents",
        query: `productBoxes/${productBoxId}/contents`,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // 4. Check uploads collection (in case content is stored there)
    console.log(`🔍 [Diagnostic] Checking uploads collection for related content`)
    try {
      const uploadsSnapshot = await db.collection("uploads").where("productBoxId", "==", productBoxId).get()

      const items = uploadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))

      diagnostic.searches.push({
        collection: "uploads",
        query: `where("productBoxId", "==", "${productBoxId}")`,
        found: !uploadsSnapshot.empty,
        count: items.length,
        items: items.slice(0, 3),
      })

      if (!uploadsSnapshot.empty) {
        diagnostic.summary.totalItemsFound += items.length
        diagnostic.summary.collectionsWithData.push("uploads")
      }
    } catch (error) {
      diagnostic.searches.push({
        collection: "uploads",
        query: `where("productBoxId", "==", "${productBoxId}")`,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // 5. Search for any documents that might reference this product box ID
    console.log(`🔍 [Diagnostic] Searching all collections for references to ${productBoxId}`)
    const collectionsToSearch = ["bundles", "products", "items", "content"]

    for (const collectionName of collectionsToSearch) {
      try {
        const snapshot = await db.collection(collectionName).where("productBoxId", "==", productBoxId).limit(5).get()

        if (!snapshot.empty) {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            data: doc.data(),
          }))

          diagnostic.searches.push({
            collection: collectionName,
            query: `where("productBoxId", "==", "${productBoxId}")`,
            found: true,
            count: items.length,
            items: items.slice(0, 2),
          })

          diagnostic.summary.collectionsWithData.push(collectionName)
        }
      } catch (error) {
        // Collection might not exist, that's okay
      }
    }

    // Generate recommendations based on findings
    if (diagnostic.summary.totalItemsFound === 0) {
      diagnostic.summary.possibleIssues.push("No content found in any collection for this product box ID")
      diagnostic.recommendations.push("Check if the product box was properly created")
      diagnostic.recommendations.push("Verify that content was actually uploaded to this product box")
      diagnostic.recommendations.push("Check if the product box ID is correct")
    } else {
      diagnostic.recommendations.push(`Found content in: ${diagnostic.summary.collectionsWithData.join(", ")}`)
    }

    // Check for common data structure issues
    const foundCollections = diagnostic.searches.filter((s) => s.found && s.items?.length > 0)
    for (const search of foundCollections) {
      if (search.items) {
        for (const item of search.items) {
          const data = item.data
          if (!data.fileUrl && !data.publicUrl && !data.downloadUrl) {
            diagnostic.summary.possibleIssues.push(`Item ${item.id} has no valid URL fields`)
          }
          if (!data.title && !data.filename && !data.originalFileName) {
            diagnostic.summary.possibleIssues.push(`Item ${item.id} has no title or filename`)
          }
        }
      }
    }

    console.log(`✅ [Diagnostic] Search complete. Found ${diagnostic.summary.totalItemsFound} total items`)

    return NextResponse.json({
      success: true,
      diagnostic,
    })
  } catch (error) {
    console.error("❌ [Diagnostic] Error:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
