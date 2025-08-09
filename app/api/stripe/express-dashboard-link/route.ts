import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

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
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { accountId } = body

    console.log(`🔗 [Express Dashboard] Creating link for user: ${userId}, account: ${accountId}`)

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    // Verify the account belongs to the user
    const connectedAccountDoc = await db.collection("connectedStripeAccounts").doc(userId).get()
    if (!connectedAccountDoc.exists) {
      return NextResponse.json({ error: "Connected account not found" }, { status: 404 })
    }

    const accountData = connectedAccountDoc.data()
    if (accountData?.stripe_user_id !== accountId) {
      return NextResponse.json({ error: "Account ID mismatch" }, { status: 403 })
    }

    // Create Express dashboard link
    const loginLink = await stripe.accounts.createLoginLink(accountId)

    console.log(`✅ [Express Dashboard] Link created successfully:`, {
      url: loginLink.url,
      accountId,
      userId,
    })

    return NextResponse.json({
      url: loginLink.url,
      success: true,
    })
  } catch (error) {
    console.error("❌ [Express Dashboard] Error creating link:", error)
    return NextResponse.json(
      {
        error: "Failed to create dashboard link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
