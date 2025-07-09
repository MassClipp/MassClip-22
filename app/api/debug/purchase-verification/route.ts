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

    // Check if this is a debug session
    const isDebugSession =
      sessionId.includes("debug") || sessionId.startsWith("cs_live_debug") || sessionId.startsWith("cs_test_debug")

    // 1. Check Stripe session (skip for debug sessions)
    let stripeSession = null
    if (!isDebugSession) {
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
        console.log(`✅ [Purchase Verification Debug] Stripe session found:`, {
          id: stripeSession.id,
          payment_status: stripeSession.payment_status,
          customer_email: stripeSession.customer_email,
        })
      } catch (error: any) {
        console.log(`❌ [Purchase Verification Debug] Stripe session not found:`, error.message)
        errors.push(`Stripe session not found: ${error.message}`)
        recommendations.push("Verify the session ID is correct and matches your Stripe environment (live vs test)")
      }
    } else {
      console.log(`ℹ️ [Purchase Verification Debug] Skipping Stripe lookup for debug session: ${sessionId}`)
      recommendations.push("This is a debug/test session - Stripe lookup skipped as expected.")
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
        // Also try stripeSessionId field
        const altQuery = await db
          .collection("users")
          .doc(actualUserId)
          .collection("purchases")
          .where("stripeSessionId", "==", sessionId)
          .limit(1)
          .get()

        if (!altQuery.empty) {
          firestorePurchase = altQuery.docs[0].data()
          console.log(`✅ [Purchase Verification Debug] Found purchase in user collection via stripeSessionId`)
        } else {
          console.log(`❌ [Purchase Verification Debug] No purchase found in user collection`)
          if (!isDebugSession) {
            errors.push("Purchase not found in user's purchases collection")
            recommendations.push("Check if the webhook processed the purchase correctly")
          }
        }
      }
    } catch (error: any) {
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
        if (!isDebugSession) {
          errors.push("Purchase not found in unified purchases collection")
        }
      }
    } catch (error: any) {
      console.error(`❌ [Purchase Verification Debug] Error checking unified purchases:`, error)
      errors.push(`Error checking unified purchases: ${error.message}`)
    }

    // 4. Check debug purchases collection (for test purchases)
    let debugPurchase = null
    if (isDebugSession) {
      try {
        const debugPurchaseDoc = await db.collection("debugPurchases").doc(sessionId).get()
        if (debugPurchaseDoc.exists) {
          debugPurchase = debugPurchaseDoc.data()
          console.log(`✅ [Purchase Verification Debug] Found debug purchase`)
          if (!firestorePurchase) {
            firestorePurchase = debugPurchase
          }
        }
      } catch (error: any) {
        console.error(`❌ [Purchase Verification Debug] Error checking debug purchases:`, error)
      }
    }

    // 5. Check webhook processing
    const webhookProcessed = !!(
      firestorePurchase?.webhookProcessedAt ||
      unifiedPurchase?.webhookProcessedAt ||
      firestorePurchase?.isTestPurchase ||
      debugPurchase?.isTestPurchase
    )

    // Generate recommendations based on findings
    if (!isDebugSession) {
      if (stripeSession && !firestorePurchase) {
        recommendations.push("Stripe session exists but no Firestore record found. Check webhook configuration.")
      }

      if (firestorePurchase && !stripeSession) {
        recommendations.push("Firestore record exists but no Stripe session found. This might be a data inconsistency.")
      }

      if (!webhookProcessed && stripeSession) {
        recommendations.push("Webhook may not have processed this purchase yet. Check webhook logs.")
      }

      if (stripeSession && stripeSession.payment_status !== "paid") {
        recommendations.push(
          `Stripe payment status is '${stripeSession.payment_status}', not 'paid'. Purchase may not be complete.`,
        )
      }

      // Success case for real purchases
      if (stripeSession && firestorePurchase && webhookProcessed) {
        recommendations.push("✅ Purchase verification looks good! All systems are working correctly.")
      }
    } else {
      // Debug session recommendations
      if (firestorePurchase || debugPurchase) {
        recommendations.push("✅ Debug purchase found in Firestore. Test purchase system is working correctly.")
      } else {
        recommendations.push("❌ Debug purchase not found. The test purchase may not have been created properly.")
      }
    }

    // Handle case where no purchase is found anywhere
    if (!firestorePurchase && !unifiedPurchase && !debugPurchase && !isDebugSession) {
      recommendations.push(
        "No purchase records found in any collection. This session may not have completed successfully.",
      )
    }

    const result = {
      sessionId,
      isDebugSession,
      stripeSession: stripeSession
        ? {
            id: stripeSession.id,
            payment_status: stripeSession.payment_status,
            status: stripeSession.status,
            customer_email: stripeSession.customer_email,
            amount_total: stripeSession.amount_total,
            currency: stripeSession.currency,
            created: stripeSession.created,
            metadata: stripeSession.metadata || {},
          }
        : null,
      firestorePurchase: firestorePurchase
        ? {
            id: firestorePurchase.id,
            status: firestorePurchase.status,
            bundleId: firestorePurchase.bundleId,
            amount: firestorePurchase.amount,
            createdAt: firestorePurchase.createdAt,
            isTestPurchase: firestorePurchase.isTestPurchase || false,
            stripeEnvironment: firestorePurchase.stripeEnvironment || "unknown",
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
      recommendations: recommendations || [],
      errors: errors || [],
    }

    console.log(`✅ [Purchase Verification Debug] Debug completed`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [Purchase Verification Debug] Error:`, error)
    return NextResponse.json(
      {
        sessionId: "unknown",
        isDebugSession: false,
        stripeSession: null,
        firestorePurchase: null,
        unifiedPurchase: null,
        webhookProcessed: false,
        recommendations: [],
        errors: [`Failed to debug purchase verification: ${error instanceof Error ? error.message : "Unknown error"}`],
      },
      { status: 500 },
    )
  }
}
