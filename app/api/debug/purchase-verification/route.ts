import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { stripe } from "@/lib/stripe"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db as clientDb } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Purchase Debug] Starting debug for session: ${sessionId}`)

    const debugResult = {
      sessionId,
      stripeSession: null,
      firestorePurchase: null,
      unifiedPurchase: null,
      webhookProcessed: false,
      recommendations: [],
      errors: [],
    }

    // 1. Check Stripe session
    try {
      console.log(`🔍 [Purchase Debug] Checking Stripe session...`)
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      debugResult.stripeSession = {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        metadata: session.metadata,
        created: session.created,
      }
      console.log(`✅ [Purchase Debug] Stripe session found:`, debugResult.stripeSession)
    } catch (stripeError) {
      console.error(`❌ [Purchase Debug] Stripe session error:`, stripeError)
      debugResult.errors.push(`Stripe session not found: ${stripeError.message}`)
    }

    // 2. Check Firestore purchase records
    try {
      console.log(`🔍 [Purchase Debug] Checking Firestore purchases...`)

      // Check user purchases collection
      const userPurchasesRef = collection(clientDb, "users", userId, "purchases")
      const purchasesQuery = query(userPurchasesRef, where("sessionId", "==", sessionId))
      const purchasesSnapshot = await getDocs(purchasesQuery)

      if (!purchasesSnapshot.empty) {
        const purchaseDoc = purchasesSnapshot.docs[0]
        debugResult.firestorePurchase = purchaseDoc.data()
        console.log(`✅ [Purchase Debug] Firestore purchase found`)
      } else {
        console.log(`❌ [Purchase Debug] No Firestore purchase found`)
        debugResult.errors.push("Purchase record not found in Firestore")
      }
    } catch (firestoreError) {
      console.error(`❌ [Purchase Debug] Firestore error:`, firestoreError)
      debugResult.errors.push(`Firestore error: ${firestoreError.message}`)
    }

    // 3. Check unified purchases collection
    try {
      console.log(`🔍 [Purchase Debug] Checking unified purchases...`)
      const unifiedPurchaseDoc = await getDoc(doc(clientDb, "userPurchases", userId, "purchases", sessionId))

      if (unifiedPurchaseDoc.exists()) {
        debugResult.unifiedPurchase = unifiedPurchaseDoc.data()
        console.log(`✅ [Purchase Debug] Unified purchase found`)
      } else {
        console.log(`❌ [Purchase Debug] No unified purchase found`)
        debugResult.errors.push("Purchase record not found in unified collection")
      }
    } catch (unifiedError) {
      console.error(`❌ [Purchase Debug] Unified purchase error:`, unifiedError)
      debugResult.errors.push(`Unified purchase error: ${unifiedError.message}`)
    }

    // 4. Check if webhook was processed
    debugResult.webhookProcessed = !!(
      debugResult.firestorePurchase?.webhookProcessedAt || debugResult.unifiedPurchase?.webhookProcessedAt
    )

    // 5. Generate recommendations
    if (debugResult.stripeSession && !debugResult.firestorePurchase) {
      debugResult.recommendations.push("Stripe session exists but no Firestore record - webhook may not have processed")
    }

    if (debugResult.stripeSession?.payment_status === "paid" && !debugResult.webhookProcessed) {
      debugResult.recommendations.push("Payment completed but webhook not processed - check webhook configuration")
    }

    if (!debugResult.stripeSession) {
      debugResult.recommendations.push("Stripe session not found - verify the session ID is correct")
    }

    if (debugResult.firestorePurchase && !debugResult.unifiedPurchase) {
      debugResult.recommendations.push("Purchase exists in user collection but not in unified collection")
    }

    if (debugResult.errors.length === 0 && debugResult.firestorePurchase) {
      debugResult.recommendations.push("✅ Purchase verification is working correctly")
    }

    console.log(`✅ [Purchase Debug] Debug completed:`, {
      hasStripeSession: !!debugResult.stripeSession,
      hasFirestorePurchase: !!debugResult.firestorePurchase,
      hasUnifiedPurchase: !!debugResult.unifiedPurchase,
      webhookProcessed: debugResult.webhookProcessed,
      errorsCount: debugResult.errors.length,
      recommendationsCount: debugResult.recommendations.length,
    })

    return NextResponse.json(debugResult)
  } catch (error) {
    console.error(`❌ [Purchase Debug] Error:`, error)
    return NextResponse.json({ error: "Debug failed", details: error.message }, { status: 500 })
  }
}
