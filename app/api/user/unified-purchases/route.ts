import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Unified Purchases] Starting fetch")

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    let authenticatedUserId: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
      } catch (error) {
        console.error("❌ [Unified Purchases] Auth error:", error)
        return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log(`🔍 [Unified Purchases] Fetching purchases for user ${authenticatedUserId}`)

    // Get unified purchases
    const purchasesRef = db.collection("userPurchases").doc(authenticatedUserId).collection("purchases")
    const snapshot = await purchasesRef.orderBy("purchasedAt", "desc").get()

    const purchases: any[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      purchases.push({
        ...data,
        purchasedAt: data.purchasedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })
    })

    console.log(`✅ [Unified Purchases] Found ${purchases.length} unified purchases for user ${authenticatedUserId}`)

    return NextResponse.json({
      success: true,
      purchases,
      count: purchases.length,
    })
  } catch (error) {
    console.error("❌ [Unified Purchases] Error fetching purchases:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
