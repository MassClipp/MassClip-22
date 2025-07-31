import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug] Validating purchase metadata...")

    const url = new URL(request.url)
    const sessionId = url.searchParams.get("sessionId")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")

    if (sessionId) {
      // Validate specific session
      return await validateSpecificSession(sessionId)
    } else {
      // Validate recent purchases
      return await validateRecentPurchases(limit)
    }
  } catch (error) {
    console.error("❌ [Debug] Error validating purchase metadata:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate purchase metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function validateSpecificSession(sessionId: string) {
  try {
    console.log("🔍 [Debug] Validating specific session:", sessionId)

    // Get session from Stripe
    let stripeSession: Stripe.Checkout.Session | null = null
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
    } catch (stripeError) {
      console.error("❌ [Debug] Failed to retrieve Stripe session:", stripeError)
    }

    // Get purchase from database
    const purchaseDoc = await db.collection("purchases").doc(sessionId).get()
    const purchaseData = purchaseDoc.exists ? purchaseDoc.data() : null

    // Also check in general purchases collection
    const purchasesSnapshot = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    const generalPurchase = purchasesSnapshot.empty ? null : purchasesSnapshot.docs[0].data()

    const validation = {
      sessionId,
      stripeSession: stripeSession
        ? {
            id: stripeSession.id,
            payment_status: stripeSession.payment_status,
            amount_total: stripeSession.amount_total,
            metadata: stripeSession.metadata,
            customer_details: stripeSession.customer_details,
          }
        : null,
      databasePurchase: purchaseData,
      generalPurchase,
      validation: {
        hasStripeSession: !!stripeSession,
        hasDatabasePurchase: !!purchaseData,
        hasGeneralPurchase: !!generalPurchase,
        stripeBuyerUid: stripeSession?.metadata?.buyerUid || null,
        databaseBuyerUid: purchaseData?.buyerUid || purchaseData?.userId || null,
        generalBuyerUid: generalPurchase?.buyerUid || generalPurchase?.userId || null,
        metadataMatch: stripeSession?.metadata?.buyerUid === (purchaseData?.buyerUid || purchaseData?.userId),
        isAnonymous: !stripeSession?.metadata?.buyerUid && !purchaseData?.buyerUid && !purchaseData?.userId,
      },
    }

    return NextResponse.json({
      success: true,
      validation,
      recommendations: generateRecommendations(validation),
    })
  } catch (error) {
    console.error("❌ [Debug] Error validating specific session:", error)
    throw error
  }
}

async function validateRecentPurchases(limit: number) {
  try {
    console.log("🔍 [Debug] Validating recent purchases, limit:", limit)

    // Get recent purchases from database
    const purchasesSnapshot = await db.collection("purchases").orderBy("createdAt", "desc").limit(limit).get()

    const validations: any[] = []
    const summary = {
      total: 0,
      withBuyerUid: 0,
      withoutBuyerUid: 0,
      stripeValidated: 0,
      metadataMismatches: 0,
    }

    for (const doc of purchasesSnapshot.docs) {
      const purchaseData = doc.data()
      const sessionId = purchaseData.sessionId

      summary.total++

      if (purchaseData.buyerUid || purchaseData.userId) {
        summary.withBuyerUid++
      } else {
        summary.withoutBuyerUid++
      }

      // Validate against Stripe if sessionId exists
      let stripeSession: Stripe.Checkout.Session | null = null
      if (sessionId) {
        try {
          stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
          summary.stripeValidated++

          // Check metadata match
          const stripeBuyerUid = stripeSession.metadata?.buyerUid
          const dbBuyerUid = purchaseData.buyerUid || purchaseData.userId

          if (stripeBuyerUid !== dbBuyerUid) {
            summary.metadataMismatches++
          }
        } catch (stripeError) {
          console.warn("⚠️ [Debug] Could not retrieve Stripe session:", sessionId)
        }
      }

      validations.push({
        purchaseId: doc.id,
        sessionId,
        buyerUid: purchaseData.buyerUid || purchaseData.userId,
        amount: purchaseData.amount,
        createdAt: purchaseData.createdAt?.toDate?.(),
        stripeBuyerUid: stripeSession?.metadata?.buyerUid || null,
        stripePaymentStatus: stripeSession?.payment_status || null,
        isValid: !!(purchaseData.buyerUid || purchaseData.userId),
        metadataMatch: stripeSession?.metadata?.buyerUid === (purchaseData.buyerUid || purchaseData.userId),
      })
    }

    return NextResponse.json({
      success: true,
      summary,
      validations,
      recommendations: [
        summary.withoutBuyerUid > 0
          ? `Found ${summary.withoutBuyerUid} purchases without buyer UID - these should be investigated`
          : "All purchases have buyer UIDs",
        summary.metadataMismatches > 0
          ? `Found ${summary.metadataMismatches} metadata mismatches between Stripe and database`
          : "All metadata matches between Stripe and database",
        "Continue monitoring purchase metadata integrity",
      ],
    })
  } catch (error) {
    console.error("❌ [Debug] Error validating recent purchases:", error)
    throw error
  }
}

function generateRecommendations(validation: any): string[] {
  const recommendations: string[] = []

  if (!validation.validation.hasStripeSession) {
    recommendations.push("Stripe session not found - this may be a test or old session")
  }

  if (!validation.validation.hasDatabasePurchase && !validation.validation.hasGeneralPurchase) {
    recommendations.push("No database purchase record found - purchase may not have been processed")
  }

  if (validation.validation.isAnonymous) {
    recommendations.push("CRITICAL: This appears to be an anonymous purchase - buyer UID is missing")
  }

  if (!validation.validation.metadataMatch) {
    recommendations.push("Metadata mismatch between Stripe and database - investigate data integrity")
  }

  if (
    validation.validation.hasStripeSession &&
    validation.validation.hasDatabasePurchase &&
    validation.validation.metadataMatch
  ) {
    recommendations.push("Purchase appears to be properly processed with buyer identification")
  }

  return recommendations
}
