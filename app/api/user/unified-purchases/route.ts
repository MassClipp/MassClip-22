import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")

    let authenticatedUserId: string | null = null

    // Verify auth token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await auth.verifyIdToken(token)
        authenticatedUserId = decodedToken.uid
        console.log("✅ [Unified Purchases API] Authenticated user:", authenticatedUserId)
      } catch (error) {
        console.error("❌ [Unified Purchases API] Error verifying auth token:", error)
      }
    }

    // Use provided userId or authenticated userId
    const finalUserId = userId || authenticatedUserId

    if (!finalUserId) {
      console.error("❌ [Unified Purchases API] No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔍 [Unified Purchases API] Fetching unified purchases for user:", finalUserId)

    // Get unified purchases
    const unifiedPurchasesRef = db.collection("userPurchases").doc(finalUserId).collection("purchases")
    const unifiedSnapshot = await unifiedPurchasesRef.orderBy("purchasedAt", "desc").get()

    console.log(`📊 [Unified Purchases API] Found ${unifiedSnapshot.size} unified purchases`)

    const purchases = unifiedSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        purchasedAt: data.purchasedAt?.toDate?.() || new Date(data.purchasedAt || Date.now()),
      }
    })

    console.log("✅ [Unified Purchases API] Returning", purchases.length, "purchases")
    return NextResponse.json({ purchases })
  } catch (error) {
    console.error("❌ [Unified Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch unified purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
