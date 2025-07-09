import { type NextRequest, NextResponse } from "next/server"
import { stripe, stripeConfig } from "@/lib/stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error)
  }
}

const db = getFirestore()

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 })
    }

    console.log(`🔍 [DEBUG] Starting purchase verification debug for session: ${sessionId}, user: ${userId}`)

    const result = {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      stripeSession: { found: false },
      firestorePurchases: {
        userPurchases: { found: false, count: 0, data: [] },
        unifiedPurchases: { found: false },
      },
      webhookLogs: {
        checkoutSession: { found: false },
      },
      recommendations: [],
      issues: [],
      success: false,
    }

    // 1. Check Stripe session
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      result.stripeSession = {
        found: true,
        data: {
          id: session.id,
          payment_status: session.payment_status,
          mode: session.mode,
          amount_total: session.amount_total,
          currency: session.currency,
          client_reference_id: session.client_reference_id,
          metadata: session.metadata,
          created: session.created,
          expires_at: session.expires_at,
        },
      }
      console.log(`✅ [DEBUG] Stripe session found: ${session.payment_status}`)
    } catch (error) {
      result.stripeSession = {
        found: false,
        error: error.message,
      }
      result.issues.push(`Stripe session not found: ${error.message}`)
      console.log(`❌ [DEBUG] Stripe session not found: ${error.message}`)
    }

    // 2. Check user purchases collection
    try {
      const userPurchasesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .get()

      result.firestorePurchases.userPurchases = {
        found: !userPurchasesSnapshot.empty,
        count: userPurchasesSnapshot.size,
        data: userPurchasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      }
      console.log(`✅ [DEBUG] User purchases check: ${userPurchasesSnapshot.size} records found`)
    } catch (error) {
      result.issues.push(`Failed to check user purchases: ${error.message}`)
      console.log(`❌ [DEBUG] User purchases check failed: ${error.message}`)
    }

    // 3. Check unified purchases collection
    try {
      const unifiedPurchaseDoc = await db
        .collection("userPurchases")
        .doc(userId)
        .collection("purchases")
        .doc(sessionId)
        .get()

      result.firestorePurchases.unifiedPurchases = {
        found: unifiedPurchaseDoc.exists,
        data: unifiedPurchaseDoc.exists ? unifiedPurchaseDoc.data() : null,
      }
      console.log(`✅ [DEBUG] Unified purchases check: ${unifiedPurchaseDoc.exists ? "found" : "not found"}`)
    } catch (error) {
      result.issues.push(`Failed to check unified purchases: ${error.message}`)
      console.log(`❌ [DEBUG] Unified purchases check failed: ${error.message}`)
    }

    // 4. Check checkout session logs
    try {
      const checkoutSessionDoc = await db.collection("checkoutSessions").doc(sessionId).get()
      result.webhookLogs.checkoutSession = {
        found: checkoutSessionDoc.exists,
        data: checkoutSessionDoc.exists ? checkoutSessionDoc.data() : null,
      }
      console.log(`✅ [DEBUG] Checkout session logs: ${checkoutSessionDoc.exists ? "found" : "not found"}`)
    } catch (error) {
      result.issues.push(`Failed to check checkout session logs: ${error.message}`)
      console.log(`❌ [DEBUG] Checkout session logs check failed: ${error.message}`)
    }

    // 5. Generate recommendations
    if (result.stripeSession.found && result.stripeSession.data.payment_status === "paid") {
      if (!result.firestorePurchases.userPurchases.found) {
        result.issues.push("Stripe session is paid but no purchase record found in Firestore")
        result.recommendations.push("Check if webhook is properly configured and receiving events")
        result.recommendations.push("Verify webhook secret matches your Stripe dashboard")
        result.recommendations.push("Check Vercel function logs for webhook processing errors")
      } else {
        result.recommendations.push("✅ Purchase verification is working correctly")
        result.success = true
      }
    } else if (result.stripeSession.found && result.stripeSession.data.payment_status !== "paid") {
      result.recommendations.push(
        `Stripe session status is '${result.stripeSession.data.payment_status}' - payment may not be complete`,
      )
    } else if (!result.stripeSession.found) {
      result.recommendations.push("Stripe session not found - check if session ID is correct")
      result.recommendations.push("Verify you're using the correct Stripe environment (test vs live)")
    }

    // Environment-specific recommendations
    if (stripeConfig.isLiveMode) {
      result.recommendations.push("⚠️ Running in LIVE mode - ensure live webhook secret is configured")
    } else {
      result.recommendations.push("ℹ️ Running in TEST mode - ensure test webhook secret is configured")
    }

    console.log(`🔍 [DEBUG] Purchase verification debug completed. Success: ${result.success}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Purchase verification debug error:", error)
    return NextResponse.json({ error: "Debug failed", details: error.message }, { status: 500 })
  }
}
