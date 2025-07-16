import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Purchase Debug] Starting purchase verification debug`)

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error(`❌ [Purchase Debug] Authentication failed`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const actualUserId = userId || decodedToken.uid

    console.log(`🔍 [Purchase Debug] Debugging session: ${sessionId} for user: ${actualUserId}`)

    // Check if this is a debug session
    const isDebugSession =
      sessionId.includes("debug") || sessionId.startsWith("cs_live_debug") || sessionId.startsWith("cs_test_debug")

    let stripeSession = null
    let stripeError = null

    // Only try to fetch from Stripe if it's not a debug session
    if (!isDebugSession) {
      try {
        console.log(`🔍 [Purchase Debug] Fetching Stripe session: ${sessionId}`)
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
        console.log(`✅ [Purchase Debug] Stripe session found: ${stripeSession.payment_status}`)
      } catch (error: any) {
        console.error(`❌ [Purchase Debug] Stripe session not found:`, error.message)
        stripeError = error.message
      }
    } else {
      console.log(`🧪 [Purchase Debug] Skipping Stripe lookup for debug session`)
    }

    // Check Firestore purchases
    let firestorePurchase = null
    try {
      // Try user's purchases subcollection first
      const userPurchaseDoc = await db
        .collection("users")
        .doc(actualUserId)
        .collection("purchases")
        .doc(sessionId)
        .get()

      if (userPurchaseDoc.exists) {
        firestorePurchase = userPurchaseDoc.data()
        console.log(`✅ [Purchase Debug] Found purchase in user subcollection`)
      } else {
        // Try unified purchases collection
        const unifiedPurchaseQuery = await db
          .collection("userPurchases")
          .doc(actualUserId)
          .collection("purchases")
          .where("sessionId", "==", sessionId)
          .limit(1)
          .get()

        if (!unifiedPurchaseQuery.empty) {
          firestorePurchase = unifiedPurchaseQuery.docs[0].data()
          console.log(`✅ [Purchase Debug] Found purchase in unified collection`)
        } else {
          // Try debug purchases collection
          const debugPurchaseDoc = await db.collection("debugPurchases").doc(sessionId).get()
          if (debugPurchaseDoc.exists) {
            firestorePurchase = debugPurchaseDoc.data()
            console.log(`✅ [Purchase Debug] Found purchase in debug collection`)
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ [Purchase Debug] Error checking Firestore:`, error)
    }

    // Check if webhook was processed
    const webhookProcessed = !!(firestorePurchase?.webhookProcessedAt || firestorePurchase?.webhookEventId)

    // Generate recommendations
    const recommendations: string[] = []
    const errors: string[] = []

    if (isDebugSession) {
      if (firestorePurchase) {
        recommendations.push("✅ Debug purchase verification looks good! Test purchase found in Firestore.")
      } else {
        errors.push("❌ Debug purchase not found in Firestore. The test purchase may not have been created properly.")
      }
    } else {
      if (stripeSession && firestorePurchase && webhookProcessed) {
        recommendations.push("✅ Purchase verification looks good! All systems are working correctly.")
      } else {
        if (!stripeSession) {
          errors.push("❌ Stripe session not found. Check if the session ID is correct.")
        }
        if (!firestorePurchase) {
          errors.push("❌ Purchase not found in Firestore. Webhook may not have processed correctly.")
        }
        if (!webhookProcessed) {
          recommendations.push("⚠️ Webhook processing not detected. Check webhook configuration.")
        }
      }
    }

    if (stripeError) {
      errors.push(`Stripe Error: ${stripeError}`)
    }

    const result = {
      sessionId,
      isDebugSession,
      stripeSession,
      firestorePurchase,
      webhookProcessed,
      recommendations,
      errors,
    }

    console.log(`✅ [Purchase Debug] Debug completed for session: ${sessionId}`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(`❌ [Purchase Debug] Error:`, error)
    return NextResponse.json(
      {
        sessionId: "",
        isDebugSession: false,
        recommendations: [],
        errors: [`Debug failed: ${error instanceof Error ? error.message : "Unknown error"}`],
        webhookProcessed: false,
      },
      { status: 500 },
    )
  }
}
