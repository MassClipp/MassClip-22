import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
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
    console.error("Firebase Admin initialization error:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header:", authHeader)
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Missing or invalid authorization header",
        },
        { status: 401 },
      )
    }

    const token = authHeader.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "No token provided",
        },
        { status: 401 },
      )
    }

    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid

    const db = getFirestore()
    const userRef = db.collection("users").doc(userId)

    // Check if user exists
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 },
      )
    }

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

    console.log(`Stripe account disconnected for user: ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Stripe account disconnected successfully",
    })
  } catch (error: any) {
    console.error("Stripe disconnect error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to disconnect Stripe account",
      },
      { status: 500 },
    )
  }
}
