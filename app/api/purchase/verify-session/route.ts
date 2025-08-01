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
    console.log("🔍 [Verify Session] Starting purchase verification...")

    // Get auth token from header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [Verify Session] No authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let userId: string

    // Verify authentication
    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log("✅ [Verify Session] Token verified for user:", userId)
    } catch (error) {
      console.error("❌ [Verify Session] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, buyerUid } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // CRITICAL: Verify buyer UID matches authenticated user
    if (buyerUid !== userId) {
      console.error("❌ [Verify Session] Buyer UID mismatch:")
      console.error("   Provided UID:", buyerUid)
      console.error("   Auth UID:", userId)
      return NextResponse.json({ error: "Buyer verification failed" }, { status: 403 })
    }

    console.log("🔍 [Verify Session] Retrieving Stripe session:", sessionId)

    // Find the purchase record first to get the connected account
    const purchasesQuery = await db
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .where("buyerUid", "==", userId) // CRITICAL: Verify buyer UID in database
      .limit(1)
      .get()

    if (purchasesQuery.empty) {
      console.error("❌ [Verify Session] No purchase record found for session:", sessionId)
      return NextResponse.json({ error: "Purchase record not found" }, { status: 404 })
    }

    const purchaseDoc = purchasesQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    // CRITICAL: Double-check buyer UID in purchase record
    if (purchaseData.buyerUid !== userId) {
      console.error("❌ [Verify Session] Buyer UID mismatch in purchase record")
      return NextResponse.json({ error: "Purchase verification failed" }, { status: 403 })
    }

    // Get bundle details
    const bundleDoc = await db.collection("bundles").doc(purchaseData.bundleId).get()
    const bundleData = bundleDoc.exists ? bundleDoc.data() : null

    console.log("✅ [Verify Session] Purchase verified successfully:")
    console.log("   Buyer UID:", purchaseData.buyerUid)
    console.log("   Bundle ID:", purchaseData.bundleId)
    console.log("   Creator ID:", purchaseData.creatorId)

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      buyerUid: purchaseData.buyerUid, // CRITICAL: Return buyer UID for verification
      bundleId: purchaseData.bundleId,
      bundleTitle: bundleData?.title || "Unknown Bundle",
      creatorId: purchaseData.creatorId,
      purchaseDate: purchaseData.purchaseDate,
      amount: purchaseData.amountTotal,
      currency: purchaseData.currency,
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Purchase verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
