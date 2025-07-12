import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get purchase access tokens from cookies
    const cookies = request.cookies
    const purchaseTokens: string[] = []

    // Look for purchase access tokens in cookies
    cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("purchase_access_")) {
        purchaseTokens.push(cookie.value)
      }
    })

    if (purchaseTokens.length === 0) {
      return NextResponse.json({ purchases: [] })
    }

    // Fetch purchases using access tokens
    const purchases: any[] = []

    for (const token of purchaseTokens) {
      try {
        // Query anonymous purchases collection using access token
        const anonymousPurchasesRef = db.collection("anonymousPurchases")
        const snapshot = await anonymousPurchasesRef.where("accessToken", "==", token).get()

        if (!snapshot.empty) {
          snapshot.forEach((doc) => {
            const purchaseData = doc.data()
            purchases.push({
              id: doc.id,
              ...purchaseData,
              anonymousAccess: true,
            })
          })
        }
      } catch (error) {
        console.error("Error fetching purchase with token:", token, error)
        // Continue with other tokens
      }
    }

    // Sort purchases by purchase date (newest first)
    purchases.sort((a, b) => {
      const dateA = a.purchasedAt?.toDate?.() || new Date(a.purchasedAt || 0)
      const dateB = b.purchasedAt?.toDate?.() || new Date(b.purchasedAt || 0)
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        ...purchase,
        purchasedAt: purchase.purchasedAt?.toDate?.()?.toISOString() || purchase.purchasedAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching anonymous purchases:", error)
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 })
  }
}
