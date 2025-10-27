import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    console.log(`🔍 [Debug User Purchases] Checking purchases for user: ${params.userId}`)

    // Get Firebase auth token from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Debug User Purchases] No auth token provided")
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
      console.log(`✅ [Debug User Purchases] Token verified for user: ${decodedToken.uid}`)
    } catch (error) {
      console.log("❌ [Debug User Purchases] Invalid token:", error)
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 })
    }

    // Only allow users to check their own purchases (or admin)
    if (decodedToken.uid !== params.userId) {
      return NextResponse.json({ error: "Unauthorized - can only check own purchases" }, { status: 403 })
    }

    // Check main purchases collection
    const mainPurchasesSnapshot = await db.collection("purchases").where("userId", "==", params.userId).get()
    const mainPurchases = mainPurchasesSnapshot.docs.map((doc) => ({
      id: doc.id,
      collection: "purchases",
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    // Check user subcollection
    const userPurchasesSnapshot = await db.collection("users").doc(params.userId).collection("purchases").get()
    const userPurchases = userPurchasesSnapshot.docs.map((doc) => ({
      id: doc.id,
      collection: "users/{userId}/purchases",
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    // Combine all purchases
    const allPurchases = [...mainPurchases, ...userPurchases]

    console.log(`✅ [Debug User Purchases] Found ${allPurchases.length} total purchases`)

    return NextResponse.json({
      success: true,
      userId: params.userId,
      totalPurchases: allPurchases.length,
      mainCollectionCount: mainPurchases.length,
      userSubcollectionCount: userPurchases.length,
      purchases: allPurchases.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA // Newest first
      }),
    })
  } catch (error) {
    console.error(`❌ [Debug User Purchases] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch user purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
