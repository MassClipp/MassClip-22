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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, buyerToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    if (!buyerToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify buyer token
    let buyerUid: string
    try {
      const decodedToken = await auth.verifyIdToken(buyerToken)
      buyerUid = decodedToken.uid
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify the buyer UID matches the session metadata
    const sessionBuyerUid = session.metadata?.buyerUid

    if (!sessionBuyerUid) {
      return NextResponse.json(
        {
          error: "Invalid session: No buyer identification found",
          isAnonymous: true,
        },
        { status: 400 },
      )
    }

    if (sessionBuyerUid !== buyerUid) {
      return NextResponse.json(
        {
          error: "Unauthorized: Buyer identity mismatch",
          isUnauthorized: true,
        },
        { status: 403 },
      )
    }

    // Check if purchase record exists
    const purchaseQuery = await db
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .where("buyerUid", "==", buyerUid)
      .limit(1)
      .get()

    if (purchaseQuery.empty) {
      return NextResponse.json(
        {
          error: "Purchase record not found",
          needsProcessing: true,
        },
        { status: 404 },
      )
    }

    const purchaseDoc = purchaseQuery.docs[0]
    const purchaseData = purchaseDoc.data()

    return NextResponse.json({
      success: true,
      verified: true,
      purchase: {
        id: purchaseDoc.id,
        buyerUid: purchaseData.buyerUid,
        creatorId: purchaseData.creatorId,
        amount: purchaseData.amount,
        status: purchaseData.status,
        purchaseType: purchaseData.purchaseType,
        productBoxId: purchaseData.productBoxId,
        bundleId: purchaseData.bundleId,
        createdAt: purchaseData.createdAt,
      },
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
      },
    })
  } catch (error) {
    console.error("Error verifying purchase session:", error)
    return NextResponse.json({ error: "Failed to verify purchase session" }, { status: 500 })
  }
}
