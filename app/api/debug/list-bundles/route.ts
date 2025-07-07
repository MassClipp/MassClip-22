import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [List Bundles] Starting bundle listing`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required to list bundles",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [List Bundles] User authenticated: ${userId}`)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")
    const activeOnly = searchParams.get("activeOnly") === "true"

    const allBundles: any[] = []

    try {
      // Fetch from productBoxes collection
      let productBoxesQuery = db.collection("productBoxes")
      if (creatorId) {
        productBoxesQuery = productBoxesQuery.where("creatorId", "==", creatorId)
      }
      if (activeOnly) {
        productBoxesQuery = productBoxesQuery.where("active", "==", true)
      }

      const productBoxesSnapshot = await productBoxesQuery.limit(100).get()

      productBoxesSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        allBundles.push({
          id: doc.id,
          collection: "productBoxes",
          title: data.title || "Untitled",
          description: data.description || "",
          price: data.price || 0,
          currency: data.currency || "usd",
          active: data.active || false,
          creatorId: data.creatorId || "",
          thumbnailUrl: data.thumbnailUrl || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
        })
      })

      console.log(`✅ [List Bundles] Found ${productBoxesSnapshot.docs.length} product boxes`)

      // Fetch from bundles collection
      let bundlesQuery = db.collection("bundles")
      if (creatorId) {
        bundlesQuery = bundlesQuery.where("creatorId", "==", creatorId)
      }
      if (activeOnly) {
        bundlesQuery = bundlesQuery.where("active", "==", true)
      }

      const bundlesSnapshot = await bundlesQuery.limit(100).get()

      bundlesSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        allBundles.push({
          id: doc.id,
          collection: "bundles",
          title: data.title || "Untitled",
          description: data.description || "",
          price: data.price || 0,
          currency: data.currency || "usd",
          active: data.active || false,
          creatorId: data.creatorId || "",
          thumbnailUrl: data.thumbnailUrl || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
        })
      })

      console.log(`✅ [List Bundles] Found ${bundlesSnapshot.docs.length} bundles`)
    } catch (firestoreError) {
      console.error(`❌ [List Bundles] Firestore error:`, firestoreError)
      return NextResponse.json(
        {
          success: false,
          error: "Database query failed",
          code: "FIRESTORE_ERROR",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Sort bundles by creation date (newest first)
    allBundles.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })

    const result = {
      success: true,
      bundles: allBundles,
      summary: {
        total: allBundles.length,
        productBoxes: allBundles.filter((b) => b.collection === "productBoxes").length,
        bundles: allBundles.filter((b) => b.collection === "bundles").length,
        active: allBundles.filter((b) => b.active).length,
        inactive: allBundles.filter((b) => !b.active).length,
      },
      filters: {
        creatorId: creatorId || null,
        activeOnly,
      },
      timestamp: new Date().toISOString(),
    }

    console.log(`✅ [List Bundles] Returning ${allBundles.length} bundles`)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [List Bundles] Unexpected error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
