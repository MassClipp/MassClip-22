import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Bundle List] Fetching all bundles`)

    const url = new URL(request.url)
    const creatorId = url.searchParams.get("creatorId")
    const limit = Number.parseInt(url.searchParams.get("limit") || "20")

    const result: any = {
      timestamp: new Date().toISOString(),
      productBoxes: [],
      bundles: [],
      summary: {
        totalProductBoxes: 0,
        totalBundles: 0,
        activeProductBoxes: 0,
        activeBundles: 0,
      },
    }

    // Fetch from productBoxes collection
    let productBoxesQuery = db.collection("productBoxes").limit(limit)
    if (creatorId) {
      productBoxesQuery = productBoxesQuery.where("creatorId", "==", creatorId)
    }

    const productBoxesSnapshot = await productBoxesQuery.get()
    result.productBoxes = productBoxesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        price: data.price,
        currency: data.currency || "usd",
        active: data.active,
        creatorId: data.creatorId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        thumbnailUrl: data.thumbnailUrl,
      }
    })

    // Fetch from bundles collection
    let bundlesQuery = db.collection("bundles").limit(limit)
    if (creatorId) {
      bundlesQuery = bundlesQuery.where("creatorId", "==", creatorId)
    }

    const bundlesSnapshot = await bundlesQuery.get()
    result.bundles = bundlesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        price: data.price,
        currency: data.currency || "usd",
        active: data.active,
        creatorId: data.creatorId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        thumbnailUrl: data.thumbnailUrl,
      }
    })

    // Calculate summary
    result.summary.totalProductBoxes = result.productBoxes.length
    result.summary.totalBundles = result.bundles.length
    result.summary.activeProductBoxes = result.productBoxes.filter((b: any) => b.active).length
    result.summary.activeBundles = result.bundles.filter((b: any) => b.active).length

    console.log(
      `✅ [Bundle List] Found ${result.summary.totalProductBoxes} product boxes, ${result.summary.totalBundles} bundles`,
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [Bundle List] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundles",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
