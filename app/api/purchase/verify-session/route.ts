import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    // Verify the user is authenticated
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      console.error("❌ [Verify Session] Authentication required")
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const { sessionId } = await request.json()
    if (!sessionId) {
      console.error("❌ [Verify Session] No session ID provided")
      return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 })
    }

    console.log("🔍 [Verify Session] Verifying session for user:", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      sessionId,
    })

    // Check if purchase exists in bundlePurchases collection
    const bundlePurchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (bundlePurchaseDoc.exists()) {
      const purchaseData = bundlePurchaseDoc.data()!

      console.log("✅ [Verify Session] Found bundle purchase:", {
        sessionId,
        buyerUid: purchaseData.buyerUid,
        userEmail: purchaseData.userEmail,
        bundleTitle: purchaseData.bundleTitle,
        status: purchaseData.status,
      })

      // Verify this purchase belongs to the authenticated user
      if (purchaseData.buyerUid === decodedToken.uid) {
        console.log("✅ [Verify Session] Purchase ownership verified")

        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          session: {
            id: sessionId,
            payment_status: "paid",
            amount_total: purchaseData.amount * 100, // Convert back to cents for display
            currency: purchaseData.currency,
          },
          purchase: purchaseData,
          item: {
            id: purchaseData.bundleId || purchaseData.productBoxId,
            title: purchaseData.bundleTitle || purchaseData.productBoxTitle,
            description: purchaseData.bundleDescription || purchaseData.productBoxDescription,
          },
        })
      } else {
        console.error("❌ [Verify Session] Purchase ownership mismatch:", {
          purchaseBuyerUid: purchaseData.buyerUid,
          authenticatedUid: decodedToken.uid,
        })
        return NextResponse.json(
          {
            success: false,
            error: "Purchase does not belong to authenticated user",
          },
          { status: 403 },
        )
      }
    }

    // If not found in bundlePurchases, check main purchases collection
    const purchasesQuery = await db
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .where("buyerUid", "==", decodedToken.uid)
      .limit(1)
      .get()

    if (!purchasesQuery.empty) {
      const purchaseDoc = purchasesQuery.docs[0]
      const purchaseData = purchaseDoc.data()

      console.log("✅ [Verify Session] Found purchase in main collection:", {
        sessionId,
        buyerUid: purchaseData.buyerUid,
        userEmail: purchaseData.userEmail,
        productTitle: purchaseData.productTitle || purchaseData.bundleTitle,
        status: purchaseData.status,
      })

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        session: {
          id: sessionId,
          payment_status: "paid",
          amount_total: purchaseData.amount * 100,
          currency: purchaseData.currency,
        },
        purchase: purchaseData,
        item: {
          id: purchaseData.productBoxId || purchaseData.bundleId,
          title: purchaseData.productTitle || purchaseData.bundleTitle,
          description: purchaseData.productDescription || purchaseData.bundleDescription,
        },
      })
    }

    // Purchase not found
    console.warn("⚠️ [Verify Session] Purchase not found for session:", sessionId)
    return NextResponse.json(
      {
        success: false,
        error: "Purchase not found or not yet processed",
      },
      { status: 404 },
    )
  } catch (error) {
    console.error("❌ [Verify Session] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify session",
      },
      { status: 500 },
    )
  }
}
