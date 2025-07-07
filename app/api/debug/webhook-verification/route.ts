import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 })
    }

    console.log(`🔍 [Webhook Debug] Debugging session: ${sessionId}, user: ${userId}`)

    const result = {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      webhookLogs: [] as any[],
      purchaseChecks: [] as any[],
      stripeSessionData: null as any,
      recommendations: [] as string[],
      success: false,
    }

    // Check 1: User purchases collection (by productBoxId)
    try {
      const userPurchasesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .get()

      result.purchaseChecks.push({
        collection: "users/{userId}/purchases",
        found: !userPurchasesSnapshot.empty,
        count: userPurchasesSnapshot.size,
        data: userPurchasesSnapshot.docs.map((doc) => ({
          id: doc.id,
          sessionId: doc.data().sessionId,
          itemTitle: doc.data().itemTitle,
          amount: doc.data().amount,
          webhookProcessedAt: doc.data().webhookProcessedAt,
        })),
      })

      if (!userPurchasesSnapshot.empty) {
        result.success = true
      }
    } catch (error) {
      result.purchaseChecks.push({
        collection: "users/{userId}/purchases",
        error: (error as Error).message,
        found: false,
      })
    }

    // Check 2: Unified purchases collection (by sessionId)
    try {
      const unifiedPurchaseDoc = await db
        .collection("userPurchases")
        .doc(userId)
        .collection("purchases")
        .doc(sessionId)
        .get()

      result.purchaseChecks.push({
        collection: "userPurchases/{userId}/purchases/{sessionId}",
        found: unifiedPurchaseDoc.exists,
        data: unifiedPurchaseDoc.exists
          ? {
              sessionId: unifiedPurchaseDoc.data()?.sessionId,
              itemTitle: unifiedPurchaseDoc.data()?.itemTitle,
              amount: unifiedPurchaseDoc.data()?.amount,
              webhookProcessedAt: unifiedPurchaseDoc.data()?.webhookProcessedAt,
            }
          : null,
      })

      if (unifiedPurchaseDoc.exists) {
        result.success = true
      }
    } catch (error) {
      result.purchaseChecks.push({
        collection: "userPurchases/{userId}/purchases/{sessionId}",
        error: (error as Error).message,
        found: false,
      })
    }

    // Check 3: Get Stripe session data
    try {
      console.log(`🔍 [Webhook Debug] Fetching Stripe session: ${sessionId}`)

      // Try to retrieve the session from the platform account first
      let session = null
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId)
        console.log(`✅ [Webhook Debug] Session found on platform account`)
      } catch (platformError) {
        console.log(`⚠️ [Webhook Debug] Session not found on platform account, trying connected accounts...`)

        // If not found on platform, we need to check connected accounts
        // But we need the connected account ID from metadata or database
        const allPurchases = await db
          .collection("users")
          .doc(userId)
          .collection("purchases")
          .where("sessionId", "==", sessionId)
          .limit(1)
          .get()

        if (!allPurchases.empty) {
          const purchaseData = allPurchases.docs[0].data()
          const connectedAccountId = purchaseData.connectedAccountId || purchaseData.stripeAccount

          if (connectedAccountId) {
            try {
              session = await stripe.checkout.sessions.retrieve(sessionId, {
                stripeAccount: connectedAccountId,
              })
              console.log(`✅ [Webhook Debug] Session found on connected account: ${connectedAccountId}`)
            } catch (connectedError) {
              console.log(`❌ [Webhook Debug] Session not found on connected account: ${connectedAccountId}`)
            }
          }
        }
      }

      if (session) {
        result.stripeSessionData = {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          mode: session.mode,
          metadata: session.metadata,
          customer_details: session.customer_details,
          created: session.created,
        }
      }
    } catch (error) {
      console.error(`❌ [Webhook Debug] Error fetching Stripe session:`, error)
      result.recommendations.push(`Failed to fetch Stripe session: ${(error as Error).message}`)
    }

    // Generate recommendations
    if (!result.success) {
      result.recommendations.push("Purchase not found in database - webhook may not have processed")

      if (result.stripeSessionData) {
        if (result.stripeSessionData.payment_status === "paid") {
          result.recommendations.push("Stripe session shows payment was successful - webhook processing failed")
          result.recommendations.push("Check webhook endpoint logs in Vercel for errors")
          result.recommendations.push("Verify webhook secret configuration")
          result.recommendations.push("Ensure webhook is configured for connected accounts")
        } else {
          result.recommendations.push(
            `Payment status is '${result.stripeSessionData.payment_status}' - payment may not have completed`,
          )
        }
      } else {
        result.recommendations.push("Stripe session not found - session ID may be incorrect")
      }
    } else {
      result.recommendations.push("Purchase found successfully!")
    }

    // Check webhook configuration
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const webhookSecret = isTestMode ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET_LIVE

    if (!webhookSecret) {
      result.recommendations.push(`Missing webhook secret for ${isTestMode ? "test" : "live"} mode`)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Webhook verification debug error:", error)
    return NextResponse.json(
      {
        error: "Debug failed",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
