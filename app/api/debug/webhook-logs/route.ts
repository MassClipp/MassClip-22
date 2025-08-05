import { type NextRequest, NextResponse } from "next/server"
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const userId = searchParams.get("userId")

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 })
    }

    console.log(`🔍 [Debug] Checking webhook processing for session: ${sessionId}, user: ${userId}`)

    const results = {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      checks: [] as any[],
    }

    // Check 1: User purchases collection
    try {
      const userPurchasesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .get()

      results.checks.push({
        collection: "users/{userId}/purchases",
        found: !userPurchasesSnapshot.empty,
        count: userPurchasesSnapshot.size,
        data: userPurchasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      })
    } catch (error) {
      results.checks.push({
        collection: "users/{userId}/purchases",
        error: error.message,
      })
    }

    // Check 2: Unified purchases collection
    try {
      const unifiedPurchaseDoc = await db
        .collection("userPurchases")
        .doc(userId)
        .collection("purchases")
        .doc(sessionId)
        .get()

      results.checks.push({
        collection: "userPurchases/{userId}/purchases/{sessionId}",
        found: unifiedPurchaseDoc.exists,
        data: unifiedPurchaseDoc.exists ? unifiedPurchaseDoc.data() : null,
      })
    } catch (error) {
      results.checks.push({
        collection: "userPurchases/{userId}/purchases/{sessionId}",
        error: error.message,
      })
    }

    // Check 3: All user purchases (for debugging)
    try {
      const allPurchasesSnapshot = await db.collection("users").doc(userId).collection("purchases").limit(10).get()

      results.checks.push({
        collection: "users/{userId}/purchases (all recent)",
        count: allPurchasesSnapshot.size,
        data: allPurchasesSnapshot.docs.map((doc) => ({
          id: doc.id,
          sessionId: doc.data().sessionId,
          itemTitle: doc.data().itemTitle,
          amount: doc.data().amount,
          purchasedAt: doc.data().purchasedAt,
        })),
      })
    } catch (error) {
      results.checks.push({
        collection: "users/{userId}/purchases (all recent)",
        error: error.message,
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Debug webhook logs error:", error)
    return NextResponse.json({ error: "Debug failed" }, { status: 500 })
  }
}
