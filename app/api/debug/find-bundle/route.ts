import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Bundle Finder] Starting bundle search`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    console.log(`✅ [Bundle Finder] User authenticated: ${userId}`)

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 },
      )
    }

    const { searchTerm, creatorId } = body

    const result: any = {
      success: true,
      searchTerm,
      creatorId,
      timestamp: new Date().toISOString(),
      productBoxes: [],
      bundles: [],
      totalFound: 0,
    }

    // Search in productBoxes collection
    console.log(`🔍 [Bundle Finder] Searching productBoxes collection`)
    let productBoxQuery = db.collection("productBoxes")

    if (creatorId) {
      productBoxQuery = productBoxQuery.where("creatorId", "==", creatorId)
    }

    const productBoxSnapshot = await productBoxQuery.limit(50).get()

    productBoxSnapshot.forEach((doc) => {
      const data = doc.data()
      const bundle = {
        id: doc.id,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || "usd",
        active: data.active,
        creatorId: data.creatorId,
        collection: "productBoxes",
        thumbnailUrl: data.thumbnailUrl,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }

      // If searchTerm is provided, filter by title or ID
      if (
        !searchTerm ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.title?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        result.productBoxes.push(bundle)
      }
    })

    // Search in bundles collection
    console.log(`🔍 [Bundle Finder] Searching bundles collection`)
    let bundlesQuery = db.collection("bundles")

    if (creatorId) {
      bundlesQuery = bundlesQuery.where("creatorId", "==", creatorId)
    }

    const bundlesSnapshot = await bundlesQuery.limit(50).get()

    bundlesSnapshot.forEach((doc) => {
      const data = doc.data()
      const bundle = {
        id: doc.id,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || "usd",
        active: data.active,
        creatorId: data.creatorId,
        collection: "bundles",
        thumbnailUrl: data.thumbnailUrl,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }

      // If searchTerm is provided, filter by title or ID
      if (
        !searchTerm ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.title?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        result.bundles.push(bundle)
      }
    })

    result.totalFound = result.productBoxes.length + result.bundles.length

    console.log(`✅ [Bundle Finder] Found ${result.totalFound} bundles`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [Bundle Finder] Unexpected error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during bundle search",
        code: "INTERNAL_ERROR",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Bundle Finder API",
      usage: "POST with { searchTerm?: 'search', creatorId?: 'creator-id' }",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  )
}
