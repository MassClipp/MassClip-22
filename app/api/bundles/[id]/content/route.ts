import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bundleId = params.id
    console.log(`🔍 [Bundle Content] Fetching content for bundle: ${bundleId}`)

    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ [Bundle Content] No valid session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`👤 [Bundle Content] User ID: ${userId}`)

    // First, get bundle info
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle Content] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`📦 [Bundle Content] Bundle found: ${bundleData.title}`)

    // Check if user has purchased this bundle
    console.log(`🔍 [Bundle Content] Checking purchase access for user ${userId}`)

    // Check bundlePurchases collection using bundleId as document ID
    const bundlePurchaseDoc = await db.collection("bundlePurchases").doc(bundleId).get()
    let hasAccess = false
    let purchaseInfo = null

    if (bundlePurchaseDoc.exists) {
      const purchaseData = bundlePurchaseDoc.data()!
      console.log(`📄 [Bundle Content] Found purchase document:`, purchaseData)

      if (purchaseData.buyerUid === userId && purchaseData.status === "completed") {
        hasAccess = true
        purchaseInfo = {
          purchaseId: bundlePurchaseDoc.id,
          purchaseDate: purchaseData.createdAt,
          status: purchaseData.status,
        }
        console.log(`✅ [Bundle Content] User has access via bundlePurchases`)
      }
    }

    // Also check by querying bundlePurchases with bundleId field
    if (!hasAccess) {
      const bundlePurchasesQuery = await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", userId)
        .where("bundleId", "==", bundleId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!bundlePurchasesQuery.empty) {
        const purchaseDoc = bundlePurchasesQuery.docs[0]
        const purchaseData = purchaseDoc.data()
        hasAccess = true
        purchaseInfo = {
          purchaseId: purchaseDoc.id,
          purchaseDate: purchaseData.createdAt,
          status: purchaseData.status,
        }
        console.log(`✅ [Bundle Content] User has access via bundlePurchases query`)
      }
    }

    // Check if user is the creator (fallback)
    if (!hasAccess && bundleData.creatorId === userId) {
      hasAccess = true
      console.log(`✅ [Bundle Content] User is the creator`)
    }

    if (!hasAccess) {
      console.log(`❌ [Bundle Content] User does not have access to bundle: ${bundleId}`)
      return NextResponse.json({ error: "You don't have access to this bundle" }, { status: 403 })
    }

    // Get bundle contents
    console.log(`📁 [Bundle Content] Fetching bundle contents`)
    const contentsQuery = await db
      .collection("bundles")
      .doc(bundleId)
      .collection("content")
      .orderBy("createdAt", "desc")
      .get()

    const contents = contentsQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ [Bundle Content] Found ${contents.length} content items`)

    // Get creator info
    let creatorUsername = "Unknown Creator"
    if (bundleData.creatorId) {
      const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()!
        creatorUsername = creatorData.username || creatorData.displayName || "Unknown Creator"
      }
    }

    const response = {
      bundle: {
        id: bundleId,
        title: bundleData.title,
        description: bundleData.description,
        creatorId: bundleData.creatorId,
        creatorUsername,
        thumbnailUrl: bundleData.thumbnailUrl,
        price: bundleData.price || 0,
        currency: bundleData.currency || "usd",
      },
      contents,
      purchaseInfo,
      hasAccess: true,
    }

    console.log(`✅ [Bundle Content] Returning response with ${contents.length} items`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Bundle Content] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle content",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
