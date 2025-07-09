import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Purchase Verification Debug] Starting debug process`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const actualUserId = userId || decodedToken.uid
    const recommendations: string[] = []
    const errors: string[] = []

    console.log(`🔍 [Purchase Verification Debug] Debugging session: ${sessionId} for user: ${actualUserId}`)

    // 1. Check Stripe session
    let stripeSession = null
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
      console.log(`✅ [Purchase Verification Debug] Stripe session found:`, {
        id: stripeSession.id,
        payment_status: stripeSession.payment_status,
        customer_email: stripeSession.customer_email,
      })
    } catch (error) {
      console.log(`❌ [Purchase Verification Debug] Stripe session not found:`, error.message)
      errors.push(`Stripe session not found: ${error.message}`)

      // Check if it's a debug session
      if (sessionId.includes("debug")) {
        recommendations.push("This appears to be a debug session ID. Check the debugPurchases collection instead.")
      } else {
        recommendations.push("Verify the session ID is correct and matches your Stripe environment (live vs test)")
      }
    }

    // 2. Check Firestore purchases in user subcollection
    let firestorePurchase = null
    try {
      // Try to find by sessionId in user purchases
      const userPurchasesQuery = await db
        .collection("users")
        .doc(actualUserId)
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get()

      if (!userPurchasesQuery.empty) {
        firestorePurchase = userPurchasesQuery.docs[0].data()
        console.log(`✅ [Purchase Verification Debug] Found purchase in user collection`)
      } else {
        console.log(`❌ [Purchase Verification Debug] No purchase found in user collection`)
        errors.push("Purchase not found in user's purchases collection")
        recommendations.push("Check if the webhook processed the purchase correctly")
      }
    } catch (error) {
      console.error(`❌ [Purchase Verification Debug] Error checking user purchases:`, error)
      errors.push(`Error checking user purchases: ${error.message}`)
    }

    // 3. Check unified purchases collection
    let unifiedPurchase = null
    try {
      const unifiedPurchaseDoc = await db
        .collection("userPurchases")
        .doc(actualUserId)
        .collection("purchases")
        .doc(sessionId)
        .get()

      if (unifiedPurchaseDoc.exists) {
        unifiedPurchase = unifiedPurchaseDoc.data()
        console.log(`✅ [Purchase Verification Debug] Found purchase in unified collection`)
      } else {
        console.log(`❌ [Purchase Verification Debug] No purchase found in unified collection`)
        errors.push("Purchase not found in unified purchases collection")
      }
    } catch (error) {
      console.error(`❌ [Purchase Verification Debug] Error checking unified purchases:`, error)
      errors.push(`Error checking unified purchases: ${error.message}`)
    }

    // 4. Check debug purchases collection (for test purchases)
    let debugPurchase = null
    try {
      const debugPurchaseDoc = await db.collection("debugPurchases").doc(sessionId).get()
      if (debugPurchaseDoc.exists) {
        debugPurchase = debugPurchaseDoc.data()
        console.log(`✅ [Purchase Verification Debug] Found debug purchase`)
        if (!firestorePurchase) {
          firestorePurchase = debugPurchase
        }
      }
    } catch (error) {
      console.error(`❌ [Purchase Verification Debug] Error checking debug purchases:`, error)
    }

    // 5. Check webhook processing
    const webhookProcessed = !!(firestorePurchase?.webhookProcessedAt || unifiedPurchase?.webhookProcessedAt)

    // Generate recommendations
    if (stripeSession && !firestorePurchase) {
      recommendations.push("Stripe session exists but no Firestore record found. Check webhook configuration.")
    }

    if (firestorePurchase && !stripeSession && !sessionId.includes("debug")) {
      recommendations.push("Firestore record exists but no Stripe session found. This might be a data inconsistency.")
    }

    if (!webhookProcessed && stripeSession) {
      recommendations.push("Webhook may not have processed this purchase yet. Check webhook logs.")
    }

    if (stripeSession?.payment_status !== "paid") {
      recommendations.push(
        `Stripe payment status is '${stripeSession.payment_status}', not 'paid'. Purchase may not be complete.`,
      )
    }

    // Success case
    if (stripeSession && firestorePurchase && webhookProcessed) {
      recommendations.push("✅ Purchase verification looks good! All systems are working correctly.")
    }

    const result = {
      sessionId,
      stripeSession: stripeSession
        ? {
            id: stripeSession.id,
            payment_status: stripeSession.payment_status,
            customer_email: stripeSession.customer_email,
            amount_total: stripeSession.amount_total,
            currency: stripeSession.currency,
            created: stripeSession.created,
          }
        : null,
      firestorePurchase: firestorePurchase
        ? {
            id: firestorePurchase.id,
            status: firestorePurchase.status,
            bundleId: firestorePurchase.bundleId,
            amount: firestorePurchase.amount,
            createdAt: firestorePurchase.createdAt,
            isTestPurchase: firestorePurchase.isTestPurchase,
          }
        : null,
      unifiedPurchase: unifiedPurchase
        ? {
            id: unifiedPurchase.id,
            status: unifiedPurchase.status,
            bundleId: unifiedPurchase.bundleId,
            amount: unifiedPurchase.amount,
          }
        : null,
      webhookProcessed,
      recommendations,
      errors,
    }

    console.log(`✅ [Purchase Verification Debug] Debug completed`)

    return NextResponse.json(result)
  } catch (error) {
    console.error(`❌ [Purchase Verification Debug] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to debug purchase verification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
