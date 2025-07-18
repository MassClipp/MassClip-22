import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { db } from "@/lib/firebase-admin"

async function getUserIdFromHeader(): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.split("Bearer ")[1]
  // Verify the Firebase ID token (replace with your actual verification logic)
  // For example, using firebase-admin:
  try {
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error("❌ [Purchases API] Auth error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [Purchases API] Fetching purchases for user: ${userId}`)

    // Query unified purchases
    const unifiedPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")
    const unifiedSnapshot = await unifiedPurchasesRef.get()

    const unifiedPurchases = unifiedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Query legacy purchases
    const legacyPurchasesRef = db.collection("users").doc(userId).collection("purchases")
    const legacySnapshot = await legacyPurchasesRef.get()

    const legacyPurchases = legacySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      unifiedPurchases,
      legacyPurchases,
      userId,
    })
  } catch (error) {
    console.error("❌ [Purchases API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
