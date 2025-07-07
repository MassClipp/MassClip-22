import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
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

// Initialize Stripe
let stripe: Stripe | null = null
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error)
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({
        error: "Missing sessionId or userId",
        sessionId: sessionId || "not provided",
        userId: userId || "not provided",
        success: false,
      })
    }

    console.log(`🔍 [Debug] Starting webhook verification debug for session: ${sessionId}, user: ${userId}`)

    const result = {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      purchaseChecks: [] as any[],
      stripeSessionData: null as any,
      recommendations: [] as string[],
      success: false,
    }

    // Check 1: users/{userId}/purchases collection (by sessionId query)
    try {
      console.log(`🔍 [Debug] Checking users/${userId}/purchases collection...`)
      const userPurchasesRef = db.collection("users").doc(userId).collection("purchases")
      const userPurchasesSnapshot = await userPurchasesRef.where("sessionId", "==", sessionId).get()

      result.purchaseChecks.push({
        collection: `users/${userId}/purchases`,
        found: !userPurchasesSnapshot.empty,
        count: userPurchasesSnapshot.size,
        data: userPurchasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      })

      if (!userPurchasesSnapshot.empty) {
        result.success = true
        console.log(`✅ [Debug] Found purchase in users collection`)
      }
    } catch (error) {
      console.error(`❌ [Debug] Error checking users purchases:`, error)
      result.purchaseChecks.push({
        collection: `users/${userId}/purchases`,
        found: false,
        error: (error as Error).message,
      })
    }

    // Check 2: userPurchases/{userId}/purchases/{sessionId} direct lookup
    try {
      console.log(`🔍 [Debug] Checking userPurchases/${userId}/purchases/${sessionId}...`)
      const unifiedPurchaseDoc = await db
        .collection("userPurchases")
        .doc(userId)
        .collection("purchases")
        .doc(sessionId)
        .get()

      result.purchaseChecks.push({
        collection: `userPurchases/${userId}/purchases/${sessionId}`,
        found: unifiedPurchaseDoc.exists,
        count: unifiedPurchaseDoc.exists ? 1 : 0,
        data: unifiedPurchaseDoc.exists ? [{ id: unifiedPurchaseDoc.id, ...unifiedPurchaseDoc.data() }] : [],
      })

      if (unifiedPurchaseDoc.exists) {
        result.success = true
        console.log(`✅ [Debug] Found purchase in unified collection`)
      }
    } catch (error) {
      console.error(`❌ [Debug] Error checking unified purchases:`, error)
      result.purchaseChecks.push({
        collection: `userPurchases/${userId}/purchases/${sessionId}`,
        found: false,
        error: (error as Error).message,
      })
    }

    // Check 3: Stripe session data
    if (stripe) {
      try {
        console.log(`🔍 [Debug] Fetching Stripe session data...`)
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        result.stripeSessionData = {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_details?.email,
          metadata: session.metadata,
          created: session.created,
          mode: session.mode,
        }
        console.log(`✅ [Debug] Retrieved Stripe session data`)
      } catch (error: any) {
        console.error(`❌ [Debug] Error fetching Stripe session:`, error)
        result.recommendations.push(`Failed to fetch Stripe session: ${error.message}`)

        if (error.code === "resource_missing") {
          result.recommendations.push("Stripe session not found - session ID may be incorrect")
        }
      }
    } else {
      result.recommendations.push("Stripe not initialized - check STRIPE_SECRET_KEY")
    }

    // Generate recommendations based on findings
    if (!result.success) {
      result.recommendations.push("Purchase not found in database - webhook may not have processed")

      if (result.stripeSessionData) {
        if (result.stripeSessionData.payment_status === "paid") {
          result.recommendations.push("Stripe session shows payment was successful")
          result.recommendations.push("Check webhook endpoint is receiving events")
          result.recommendations.push("Verify webhook secret configuration")
        } else {
          result.recommendations.push(`Stripe payment status: ${result.stripeSessionData.payment_status}`)
        }

        if (result.stripeSessionData.metadata) {
          const { productBoxId, buyerUid, creatorUid } = result.stripeSessionData.metadata
          if (!productBoxId) result.recommendations.push("Missing productBoxId in session metadata")
          if (!buyerUid) result.recommendations.push("Missing buyerUid in session metadata")
          if (!creatorUid) result.recommendations.push("Missing creatorUid in session metadata")
        } else {
          result.recommendations.push("No metadata found in Stripe session")
        }
      } else {
        result.recommendations.push("Stripe session not found - session ID may be incorrect")
      }
    } else {
      result.recommendations.push("✅ Purchase found successfully!")
    }

    console.log(`🔍 [Debug] Webhook verification debug completed. Success: ${result.success}`)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in webhook verification debug:", error)
    return NextResponse.json(
      {
        error: "Debug request failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
        success: false,
      },
      { status: 500 },
    )
  }
}
