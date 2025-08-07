import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle API] Fetching bundle: ${bundleId}`)

    // Get auth token if provided (optional for public bundle info)
    const authHeader = request.headers.get("authorization")
    let userId: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await getAuth().verifyIdToken(token)
        userId = decodedToken.uid
        console.log(`🔐 [Bundle API] Authenticated user: ${userId}`)
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Token verification failed:`, error)
        // Continue without auth - bundle info might be public
      }
    }

    // Fetch bundle from Firestore
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle API] Bundle not found: ${bundleId}`)
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    const bundleData = bundleDoc.data()
    console.log(`✅ [Bundle API] Found bundle: ${bundleData?.title}`)

    // Get creator info
    let creatorInfo = null
    if (bundleData?.creatorId) {
      try {
        const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          creatorInfo = {
            id: bundleData.creatorId,
            username: creatorData?.username || "Unknown Creator",
            displayName: creatorData?.displayName || creatorData?.name,
            profilePicture: creatorData?.profilePicture || null,
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Could not fetch creator info:`, error)
      }
    }

    // Check if user has purchased this bundle (if authenticated)
    let hasPurchased = false
    if (userId) {
      try {
        const purchaseQuery = await db
          .collection("bundlePurchases")
          .where("bundleId", "==", bundleId)
          .where("buyerUid", "==", userId)
          .limit(1)
          .get()
        
        hasPurchased = !purchaseQuery.empty
        console.log(`🛒 [Bundle API] User ${userId} has purchased: ${hasPurchased}`)
      } catch (error) {
        console.warn(`⚠️ [Bundle API] Could not check purchase status:`, error)
      }
    }

    // Return bundle information
    const response = {
      id: bundleId,
      title: bundleData?.title || "Untitled Bundle",
      description: bundleData?.description || "",
      price: bundleData?.price || 0,
      currency: bundleData?.currency || "usd",
      thumbnailUrl: bundleData?.thumbnailUrl || bundleData?.coverImage || null,
      coverImage: bundleData?.coverImage || bundleData?.thumbnailUrl || null,
      active: bundleData?.active !== false,
      contentCount: bundleData?.contentCount || 0,
      totalItems: bundleData?.totalItems || bundleData?.contentCount || 0,
      createdAt: bundleData?.createdAt || null,
      updatedAt: bundleData?.updatedAt || null,
      creator: creatorInfo,
      hasPurchased,
      contentItems: bundleData?.contentItems || [],
      detailedContentItems: bundleData?.detailedContentItems || [],
      contentMetadata: bundleData?.contentMetadata || null,
    }

    console.log(`✅ [Bundle API] Returning bundle data for: ${response.title}`)

    return NextResponse.json({
      success: true,
      bundle: response,
    })

  } catch (error: any) {
    console.error("❌ [Bundle API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bundle",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
