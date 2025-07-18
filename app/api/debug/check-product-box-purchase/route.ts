import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function getUserIdFromHeader(): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.split("Bearer ")[1]
  try {
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error("❌ [Check Purchase] Auth error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const authenticatedUserId = await getUserIdFromHeader()

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get product box ID from query
    const { searchParams } = new URL(request.url)
    const productBoxId = searchParams.get("productBoxId")

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Check Purchase] Checking purchase for user ${authenticatedUserId} and product box ${productBoxId}`)

    // Check unified purchases
    const unifiedPurchasesRef = db.collection("userPurchases").doc(authenticatedUserId).collection("purchases")
    const unifiedSnapshot = await unifiedPurchasesRef.where("productBoxId", "==", productBoxId).get()

    const unifiedPurchases = unifiedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      source: "unified",
    }))

    // Check legacy purchases
    const legacyPurchasesRef = db.collection("users").doc(authenticatedUserId).collection("purchases")
    const legacySnapshot = await legacyPurchasesRef.where("productBoxId", "==", productBoxId).get()

    const legacyPurchases = legacySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      source: "legacy",
    }))

    // Check product box
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()
    const productBoxExists = productBoxDoc.exists
    const productBoxData = productBoxExists ? productBoxDoc.data() : null

    // Check content items
    let contentItems = []
    if (productBoxExists) {
      // Try productBoxContent collection
      const contentSnapshot = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

      contentItems = contentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        source: "productBoxContent",
      }))

      // If no items found, try uploads
      if (contentItems.length === 0) {
        const uploadsSnapshot = await db.collection("uploads").where("productBoxId", "==", productBoxId).get()

        contentItems = uploadsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          source: "uploads",
        }))
      }
    }

    return NextResponse.json({
      success: true,
      productBoxId,
      hasUnifiedPurchase: unifiedPurchases.length > 0,
      hasLegacyPurchase: legacyPurchases.length > 0,
      productBoxExists,
      contentItemsCount: contentItems.length,
      unifiedPurchases,
      legacyPurchases,
      productBox: productBoxData,
      contentItems: contentItems.slice(0, 5), // Just show first 5 to avoid huge response
    })
  } catch (error) {
    console.error("❌ [Check Purchase] Error:", error)
    return NextResponse.json(
      {
        error: "Check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
