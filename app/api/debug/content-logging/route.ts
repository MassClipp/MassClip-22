import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getParams(request: NextRequest): Promise<{ productBoxId: string | null; userId: string | null }> {
  const { searchParams } = new URL(request.url)
  const productBoxId = searchParams.get("productBoxId")
  const userId = searchParams.get("userId")
  return { productBoxId, userId }
}

export async function GET(request: NextRequest) {
  try {
    const { productBoxId, userId } = await getParams(request)

    console.log("🔍 [Content Logging Debug] Checking content logging for:", { productBoxId, userId })

    const results: any = {
      timestamp: new Date().toISOString(),
      productBoxId,
      userId,
      checks: {},
    }

    if (productBoxId) {
      // Check product box exists
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      results.checks.productBoxExists = productBoxDoc.exists
      results.checks.productBoxData = productBoxDoc.exists ? productBoxDoc.data() : null

      // Check content items
      const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

      results.checks.contentItems = {
        count: contentQuery.size,
        items: contentQuery.docs.map((doc) => ({
          id: doc.id,
          fileName: doc.data().fileName,
          category: doc.data().category,
          fileSize: doc.data().fileSize,
          status: doc.data().status,
          uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString(),
        })),
      }

      // Check access logs
      const accessLogsQuery = await db
        .collection("contentAccessLogs")
        .where("productBoxId", "==", productBoxId)
        .orderBy("accessGrantedAt", "desc")
        .limit(10)
        .get()

      results.checks.accessLogs = {
        count: accessLogsQuery.size,
        recentLogs: accessLogsQuery.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId,
          accessGrantedAt: doc.data().accessGrantedAt?.toDate?.()?.toISOString(),
          accessMethod: doc.data().accessMethod,
          contentItemsCount: doc.data().contentItemsCount,
        })),
      }
    }

    if (userId) {
      // Check user purchases
      const purchasesQuery = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .where("type", "==", "product_box")
        .orderBy("purchasedAt", "desc")
        .limit(10)
        .get()

      results.checks.userPurchases = {
        count: purchasesQuery.size,
        purchases: purchasesQuery.docs.map((doc) => ({
          id: doc.id,
          productBoxId: doc.data().productBoxId,
          itemTitle: doc.data().itemTitle,
          status: doc.data().status,
          purchasedAt: doc.data().purchasedAt?.toDate?.()?.toISOString(),
          contentItemsCount: doc.data().contentItemsCount,
          accessUrl: doc.data().accessUrl,
        })),
      }

      // Check main purchases collection
      const mainPurchasesQuery = await db
        .collection("purchases")
        .where("userId", "==", userId)
        .where("type", "==", "product_box")
        .orderBy("purchasedAt", "desc")
        .limit(10)
        .get()

      results.checks.mainPurchases = {
        count: mainPurchasesQuery.size,
        purchases: mainPurchasesQuery.docs.map((doc) => ({
          id: doc.id,
          productBoxId: doc.data().productBoxId,
          itemTitle: doc.data().itemTitle,
          status: doc.data().status,
          purchasedAt: doc.data().purchasedAt?.toDate?.()?.toISOString(),
        })),
      }
    }

    console.log("✅ [Content Logging Debug] Results:", results)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("❌ [Content Logging Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check content logging",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
