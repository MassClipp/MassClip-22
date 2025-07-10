import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id

    console.log(`🔍 [Bundle API] Fetching bundle details for: ${bundleId}`)

    // Get bundle details
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle API] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    // Get creator details
    let creatorData = null
    if (bundleData?.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Could not fetch creator:`, error)
      }
    }

    const response = {
      id: bundleDoc.id,
      title: bundleData?.title || "Untitled Bundle",
      description: bundleData?.description || "",
      customPreviewThumbnail: bundleData?.customPreviewThumbnail,
      thumbnailUrl: bundleData?.thumbnailUrl,
      price: bundleData?.price || 0,
      currency: bundleData?.currency || "usd",
      creatorId: bundleData?.creatorId,
      creatorUsername: creatorData?.username || "Unknown",
      creatorDisplayName: creatorData?.displayName,
      totalItems: bundleData?.totalItems || 0,
      totalSize: bundleData?.totalSize || 0,
      createdAt: bundleData?.createdAt,
      updatedAt: bundleData?.updatedAt,
    }

    console.log(`✅ [Bundle API] Bundle details fetched successfully`)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`❌ [Bundle API] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle details",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
