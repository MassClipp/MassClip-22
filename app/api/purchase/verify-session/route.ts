import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    const { sessionId, buyerUid } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let authenticatedUserId: string

    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      authenticatedUserId = decodedToken.uid
      console.log("✅ [Verify Session] User authenticated:", authenticatedUserId)
    } catch (error) {
      console.error("❌ [Verify Session] Authentication failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // CRITICAL: Verify buyer UID matches authenticated user
    if (buyerUid && buyerUid !== authenticatedUserId) {
      console.error("🚨 [Verify Session] Buyer UID mismatch!")
      console.error("   Provided Buyer UID:", buyerUid)
      console.error("   Authenticated User UID:", authenticatedUserId)
      return NextResponse.json({ error: "Unauthorized access to purchase" }, { status: 403 })
    }

    // Find purchase record by session ID and buyer UID
    console.log("🔍 [Verify Session] Looking up purchase record...")
    const purchaseQuery = await db
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .where("buyerUid", "==", authenticatedUserId) // CRITICAL: Verify buyer UID
      .limit(1)
      .get()

    if (purchaseQuery.empty) {
      console.error("❌ [Verify Session] Purchase not found for session:", sessionId)
      console.error("   Buyer UID:", authenticatedUserId)
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const purchaseDoc = purchaseQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    console.log("✅ [Verify Session] Purchase found:", {
      id: purchaseDoc.id,
      buyerUid: purchaseData.buyerUid,
      bundleId: purchaseData.bundleId,
      sessionId: purchaseData.sessionId,
    })

    // Get bundle details
    const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
    if (!bundleDoc.exists) {
      console.error("❌ [Verify Session] Bundle not found:", purchaseData.bundleId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    // Verify Stripe session (optional additional verification)
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        stripeAccount: purchaseData.stripeAccountId || undefined,
      })

      // CRITICAL: Verify buyer UID in Stripe metadata matches
      if (stripeSession.metadata?.buyerUid !== authenticatedUserId) {
        console.error("🚨 [Verify Session] Stripe metadata buyer UID mismatch!")
        console.error("   Stripe Buyer UID:", stripeSession.metadata?.buyerUid)
        console.error("   Authenticated User UID:", authenticatedUserId)
        return NextResponse.json({ error: "Session verification failed" }, { status: 403 })
      }

      console.log("✅ [Verify Session] Stripe session verified")
    } catch (stripeError) {
      console.warn("⚠️ [Verify Session] Could not verify Stripe session:", stripeError)
      // Continue without Stripe verification if it fails
    }

    // Return purchase details
    const response = {
      sessionId: purchaseData.sessionId,
      bundleId: purchaseData.bundleId,
      bundleTitle: bundleData.title,
      amount: purchaseData.amountTotal,
      currency: purchaseData.currency,
      buyerUid: purchaseData.buyerUid, // CRITICAL: Include verified buyer UID
      creatorId: purchaseData.creatorId,
      purchaseDate: purchaseData.purchaseDate.toISOString(),
      status: purchaseData.status,
      purchaseId: purchaseDoc.id,
    }

    console.log("✅ [Verify Session] Session verification completed successfully")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Verify Session] Error:", error)
    return NextResponse.json(
      {
        error: "Session verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
