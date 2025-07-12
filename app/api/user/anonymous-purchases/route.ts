import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get("purchase_access_token")?.value

    if (!accessToken) {
      return NextResponse.json({ purchases: [], message: "No access token found" })
    }

    console.log(`🔍 [Anonymous Purchases] Fetching purchases for token: ${accessToken}`)

    // Get purchase by access token
    const purchaseDoc = await db.collection("anonymousPurchases").doc(accessToken).get()

    if (!purchaseDoc.exists) {
      return NextResponse.json({ purchases: [], message: "No purchases found for this token" })
    }

    const purchaseData = purchaseDoc.data()!

    // Check if access has expired
    if (purchaseData.expiresAt && purchaseData.expiresAt.toDate() < new Date()) {
      return NextResponse.json({ purchases: [], message: "Access token has expired" })
    }

    console.log(`✅ [Anonymous Purchases] Found purchase: ${purchaseData.id}`)

    // Format the purchase data
    const formattedPurchase = {
      id: purchaseData.id,
      productBoxId: purchaseData.productBoxId,
      productBoxTitle: purchaseData.productBoxTitle || "Premium Content",
      productBoxDescription: purchaseData.productBoxDescription || "",
      productBoxThumbnail: purchaseData.productBoxThumbnail || "/placeholder.svg?height=200&width=200",
      creatorName: purchaseData.creatorName || "Content Creator",
      creatorUsername: purchaseData.creatorUsername || "creator",
      amount: purchaseData.amount || 0,
      currency: purchaseData.currency || "usd",
      items: purchaseData.items || [],
      totalItems: purchaseData.totalItems || 0,
      totalSize: purchaseData.totalSize || 0,
      purchasedAt: purchaseData.purchaseDate?.toDate?.()?.toISOString() || new Date().toISOString(),
      status: purchaseData.status || "completed",
      accessGranted: true,
      anonymousAccess: true,
    }

    return NextResponse.json({
      purchases: [formattedPurchase],
      accessToken,
      message: "Purchases retrieved successfully",
    })
  } catch (error: any) {
    console.error(`❌ [Anonymous Purchases] Error:`, error)
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch purchases",
        purchases: [],
      },
      { status: 500 },
    )
  }
}
