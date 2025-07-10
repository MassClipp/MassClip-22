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
    const bundleId = params.id

    console.log(`🔍 [Bundles API] Fetching bundle: ${bundleId}`)

    // Get bundle details
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
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
        console.warn(`⚠️ [Bundles API] Could not fetch creator:`, error)
      }
    }

    const response = {
      id: bundleId,
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
      createdAt: bundleData?.createdAt,
      updatedAt: bundleData?.updatedAt,
    }

    console.log(`✅ [Bundles API] Bundle fetched successfully:`, response.title)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`❌ [Bundles API] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
