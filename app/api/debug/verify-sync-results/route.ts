import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getParams(request: NextRequest): Promise<{ productBoxId: string | null; userId: string | null }> {
  const searchParams = request.nextUrl.searchParams
  const productBoxId = searchParams.get("productBoxId")
  const userId = searchParams.get("userId")
  return { productBoxId, userId }
}

export async function GET(request: NextRequest) {
  try {
    const { productBoxId, userId } = await getParams(request)

    if (!productBoxId || !userId) {
      return NextResponse.json({ error: "Product box ID and User ID are required" }, { status: 400 })
    }

    console.log(`🔍 [Verify Sync] Verifying sync results for product box: ${productBoxId} and user: ${userId}`)

    const results = {
      productBoxId,
      userId,
      timestamp: new Date().toISOString(),
      unifiedPurchase: null,
      legacyPurchase: null,
      productBoxContent: [],
    }

    // Check unified purchases
    const unifiedPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")
    const unifiedSnapshot = await unifiedPurchasesRef.where("productBoxId", "==", productBoxId).get()

    if (!unifiedSnapshot.empty) {
      results.unifiedPurchase = {
        id: unifiedSnapshot.docs[0].id,
        data: unifiedSnapshot.docs[0].data(),
      }
    }

    // Check legacy purchases
    const legacyPurchasesRef = db.collection("users").doc(userId).collection("purchases")
    const legacySnapshot = await legacyPurchasesRef.where("productBoxId", "==", productBoxId).get()

    if (!legacySnapshot.empty) {
      results.legacyPurchase = {
        id: legacySnapshot.docs[0].id,
        data: legacySnapshot.docs[0].data(),
      }
    }

    // Check product box content
    const productBoxContentRef = db.collection("productBoxContent")
    const productBoxContentSnapshot = await productBoxContentRef.where("productBoxId", "==", productBoxId).get()

    productBoxContentSnapshot.forEach((doc) => {
      results.productBoxContent.push({
        id: doc.id,
        data: doc.data(),
      })
    })

    console.log("✅ [Verify Sync] Verification complete:", results)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("❌ [Verify Sync] Error:", error)
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
