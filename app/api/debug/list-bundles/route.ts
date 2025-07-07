import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Bundle Finder] Starting bundle search`)

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
    console.log(`✅ [Bundle Finder] User authenticated: ${userId}`)

    // Get all product boxes
    const productBoxesSnapshot = await db.collection("productBoxes").get()
    const productBoxes = productBoxesSnapshot.docs.map((doc) => ({
      id: doc.id,
      collection: "productBoxes",
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    // Get all bundles
    const bundlesSnapshot = await db.collection("bundles").get()
    const bundles = bundlesSnapshot.docs.map((doc) => ({
      id: doc.id,
      collection: "bundles",
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    const allBundles = [...productBoxes, ...bundles]

    console.log(`✅ [Bundle Finder] Found ${allBundles.length} total bundles`)

    return NextResponse.json({
      success: true,
      bundles: allBundles,
      counts: {
        productBoxes: productBoxes.length,
        bundles: bundles.length,
        total: allBundles.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ [Bundle Finder] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bundles",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
