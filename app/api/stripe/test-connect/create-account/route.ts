import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json(
        { error: "Test account creation only available in preview environment" },
        { status: 403 },
      )
    }

    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    // Check if user already has a test account
    if (userData.stripeTestAccountId) {
      return NextResponse.json({
        success: true,
        accountId: userData.stripeTestAccountId,
        message: "Test account already exists",
        existing: true,
      })
    }

    console.log("🧪 [Test Connect] Creating test Stripe Express account for user:", uid)

    // Create test Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userData.email,
      metadata: {
        firebaseUid: uid,
        username: userData.username || "",
        environment: "test",
        createdBy: "preview-test-flow",
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
    })

    console.log("✅ [Test Connect] Created test account:", account.id)

    // Store test account ID in Firestore
    await db.collection("users").doc(uid).update({
      stripeTestAccountId: account.id,
      stripeTestAccountCreated: new Date(),
      stripeAccountId: account.id, // Use as primary account ID in preview
      stripeAccountCreated: new Date(),
    })

    console.log("✅ [Test Connect] Stored test account ID in Firestore")

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: "Test Stripe Connect account created successfully",
      existing: false,
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error creating test account:", error)
    return NextResponse.json({ error: "Failed to create test account" }, { status: 500 })
  }
}
