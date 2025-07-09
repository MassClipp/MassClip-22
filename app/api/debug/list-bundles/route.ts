import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [List Bundles] Fetching bundles for debugging`)

    // Get all bundles
    const bundlesSnapshot = await db.collection("bundles").limit(50).get()

    const bundles = bundlesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "No description",
        price: data.price || 0,
        creatorId: data.creatorId || "unknown",
        active: data.active !== false, // Default to true if not specified
        currency: data.currency || "usd",
        type: data.type || "one_time",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    })

    console.log(`✅ [List Bundles] Found ${bundles.length} bundles`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error) {
    console.error(`❌ [List Bundles] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bundles",
        details: error instanceof Error ? error.message : "Unknown error",
        bundles: [],
        count: 0,
      },
      { status: 500 },
    )
  }
}
