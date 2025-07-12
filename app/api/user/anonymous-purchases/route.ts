import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Anonymous Purchases] Checking for access tokens in cookies")

    // Get access tokens from cookies
    const cookies = request.cookies
    const accessTokens: string[] = []

    // Look for access token cookies (they might be named with different patterns)
    cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("purchase_access_") || cookie.name === "purchase_access_token") {
        accessTokens.push(cookie.value)
      }
    })

    if (accessTokens.length === 0) {
      console.log("❌ [Anonymous Purchases] No access tokens found in cookies")
      return NextResponse.json({ purchases: [] })
    }

    console.log(`✅ [Anonymous Purchases] Found ${accessTokens.length} access tokens`)

    // Fetch purchases using access tokens
    const purchases: any[] = []

    for (const token of accessTokens) {
      try {
        // Query anonymous purchases collection
        const anonymousPurchasesQuery = await db
          .collection("anonymousPurchases")
          .where("accessToken", "==", token)
          .get()

        anonymousPurchasesQuery.forEach((doc) => {
          const data = doc.data()
          purchases.push({
            id: doc.id,
            ...data,
            isAnonymous: true,
          })
        })

        // Also check regular purchases collection for this token
        const regularPurchasesQuery = await db.collection("purchases").where("accessToken", "==", token).get()

        regularPurchasesQuery.forEach((doc) => {
          const data = doc.data()
          purchases.push({
            id: doc.id,
            ...data,
            isAnonymous: false,
          })
        })
      } catch (tokenError) {
        console.error(`❌ [Anonymous Purchases] Error processing token ${token}:`, tokenError)
      }
    }

    console.log(`✅ [Anonymous Purchases] Found ${purchases.length} total purchases`)

    // Remove duplicates based on bundleId or productBoxId
    const uniquePurchases = purchases.filter((purchase, index, self) => {
      const identifier = purchase.bundleId || purchase.productBoxId
      return index === self.findIndex((p) => (p.bundleId || p.productBoxId) === identifier)
    })

    return NextResponse.json({
      purchases: uniquePurchases,
      totalCount: uniquePurchases.length,
    })
  } catch (error) {
    console.error("❌ [Anonymous Purchases] Error:", error)
    return NextResponse.json({ error: "Failed to fetch anonymous purchases" }, { status: 500 })
  }
}
