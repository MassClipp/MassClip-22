import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug] Checking for anonymous purchases...")

    // Check purchases collection for entries without buyerUid
    const purchasesSnapshot = await db.collection("purchases").get()
    const anonymousPurchases: any[] = []
    const validPurchases: any[] = []

    purchasesSnapshot.forEach((doc) => {
      const data = doc.data()
      if (!data.buyerUid && !data.userId) {
        anonymousPurchases.push({
          id: doc.id,
          sessionId: data.sessionId,
          amount: data.amount,
          createdAt: data.createdAt?.toDate?.() || data.timestamp?.toDate?.(),
          productBoxId: data.productBoxId,
          bundleId: data.bundleId,
          metadata: data.metadata || {},
        })
      } else {
        validPurchases.push({
          id: doc.id,
          buyerUid: data.buyerUid || data.userId,
          sessionId: data.sessionId,
          amount: data.amount,
          createdAt: data.createdAt?.toDate?.() || data.timestamp?.toDate?.(),
        })
      }
    })

    // Check error logs for blocked anonymous purchases
    const errorLogsSnapshot = await db
      .collection("error_logs")
      .where("type", "==", "anonymous_purchase_blocked")
      .orderBy("timestamp", "desc")
      .limit(50)
      .get()

    const blockedAttempts: any[] = []
    errorLogsSnapshot.forEach((doc) => {
      const data = doc.data()
      blockedAttempts.push({
        id: doc.id,
        sessionId: data.sessionId,
        timestamp: data.timestamp?.toDate?.(),
        metadata: data.metadata || {},
        severity: data.severity,
      })
    })

    console.log(`✅ [Debug] Found ${anonymousPurchases.length} anonymous purchases`)
    console.log(`✅ [Debug] Found ${validPurchases.length} valid purchases`)
    console.log(`✅ [Debug] Found ${blockedAttempts.length} blocked attempts`)

    return NextResponse.json({
      success: true,
      summary: {
        totalPurchases: purchasesSnapshot.size,
        anonymousPurchases: anonymousPurchases.length,
        validPurchases: validPurchases.length,
        blockedAttempts: blockedAttempts.length,
      },
      anonymousPurchases: anonymousPurchases.slice(0, 10), // Limit to first 10
      validPurchases: validPurchases.slice(0, 5), // Show some valid ones for comparison
      blockedAttempts: blockedAttempts.slice(0, 10), // Recent blocked attempts
      recommendations:
        anonymousPurchases.length > 0
          ? [
              "Consider implementing a cleanup script to handle anonymous purchases",
              "Review webhook processing to ensure buyer UID is always captured",
              "Add additional validation in purchase verification endpoints",
            ]
          : [
              "No anonymous purchases found - system is working correctly",
              "Continue monitoring for any new anonymous purchase attempts",
            ],
    })
  } catch (error) {
    console.error("❌ [Debug] Error checking anonymous purchases:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check anonymous purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
