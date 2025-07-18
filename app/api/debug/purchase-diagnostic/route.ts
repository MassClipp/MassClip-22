import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getUserIdFromParams(request: NextRequest): Promise<string | null> {
  const searchParams = request.nextUrl.searchParams
  return searchParams.get("userId")
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromParams(request)

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Purchase Diagnostic] Checking purchases for user: ${userId}`)

    const diagnosticData = {
      userId,
      timestamp: new Date().toISOString(),
      collections: {},
      summary: {
        totalPurchases: 0,
        totalUnifiedPurchases: 0,
        totalLegacyPurchases: 0,
        recentStripeWebhooks: 0,
      },
    }

    // Check userPurchases collection (unified)
    try {
      const unifiedPurchasesRef = db.collection("userPurchases").doc(userId).collection("purchases")
      const unifiedSnapshot = await unifiedPurchasesRef.get()

      diagnosticData.collections.unifiedPurchases = {
        count: unifiedSnapshot.size,
        documents: unifiedSnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        })),
      }
      diagnosticData.summary.totalUnifiedPurchases = unifiedSnapshot.size
    } catch (error) {
      console.error("Error checking unified purchases:", error)
      diagnosticData.collections.unifiedPurchases = { error: error.message }
    }

    // Check legacy purchases collection
    try {
      const legacyPurchasesRef = db.collection("users").doc(userId).collection("purchases")
      const legacySnapshot = await legacyPurchasesRef.get()

      diagnosticData.collections.legacyPurchases = {
        count: legacySnapshot.size,
        documents: legacySnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        })),
      }
      diagnosticData.summary.totalLegacyPurchases = legacySnapshot.size
    } catch (error) {
      console.error("Error checking legacy purchases:", error)
      diagnosticData.collections.legacyPurchases = { error: error.message }
    }

    // Check global purchases collection
    try {
      const globalPurchasesRef = db.collection("purchases").where("buyerUid", "==", userId)
      const globalSnapshot = await globalPurchasesRef.get()

      diagnosticData.collections.globalPurchases = {
        count: globalSnapshot.size,
        documents: globalSnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        })),
      }
    } catch (error) {
      console.error("Error checking global purchases:", error)
      diagnosticData.collections.globalPurchases = { error: error.message }
    }

    // Check recent Stripe webhooks (last 24 hours)
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const webhooksRef = db
        .collection("stripeWebhooks")
        .where("metadata.buyerUid", "==", userId)
        .where("timestamp", ">=", yesterday)
      const webhooksSnapshot = await webhooksRef.get()

      diagnosticData.collections.recentWebhooks = {
        count: webhooksSnapshot.size,
        documents: webhooksSnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        })),
      }
      diagnosticData.summary.recentStripeWebhooks = webhooksSnapshot.size
    } catch (error) {
      console.error("Error checking webhooks:", error)
      diagnosticData.collections.recentWebhooks = { error: error.message }
    }

    // Calculate total purchases
    diagnosticData.summary.totalPurchases =
      diagnosticData.summary.totalUnifiedPurchases + diagnosticData.summary.totalLegacyPurchases

    console.log(`✅ [Purchase Diagnostic] Summary:`, diagnosticData.summary)

    return NextResponse.json(diagnosticData)
  } catch (error) {
    console.error("❌ [Purchase Diagnostic] Error:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
