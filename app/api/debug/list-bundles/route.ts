import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [List Bundles Debug] Starting bundle listing`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all bundles from Firestore
    const bundlesSnapshot = await db.collection("bundles").orderBy("createdAt", "desc").limit(20).get()

    const bundles = bundlesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "No description",
        price: data.price || 0,
        currency: data.currency || "usd",
        creatorId: data.creatorId,
        active: data.active !== false, // Default to true if not specified
        createdAt: data.createdAt,
        contentItems: data.contentItems || [],
      }
    })

    console.log(`✅ [List Bundles Debug] Found ${bundles.length} bundles`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error) {
    console.error(`❌ [List Bundles Debug] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to list bundles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
