import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const db = getFirestore()
    const userRef = db.collection("users").doc(userId)

    // Remove Stripe connection data
    await userRef.update({
      stripeAccountId: null,
      stripeConnected: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      stripeRequirements: null,
      stripeCapabilities: null,
      stripeAccountStatus: null,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Stripe account disconnected successfully",
    })
  } catch (error: any) {
    console.error("Stripe disconnect error:", error)
    return NextResponse.json({ error: "Failed to disconnect Stripe account" }, { status: 500 })
  }
}
