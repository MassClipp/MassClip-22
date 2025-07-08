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

    console.log("🆕 [Test Connect] Creating test account for user:", uid)

    try {
      // Create a new Stripe Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // Default to US, can be changed during onboarding
        email: userData.email || decodedToken.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          firebaseUid: uid,
          username: userData.username || "",
          environment: "test",
          createdBy: "preview-test-flow",
          createdAt: new Date().toISOString(),
        },
      })

      console.log("✅ [Test Connect] Created test account:", {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
      })

      // Store the test account ID in Firestore
      await db.collection("users").doc(uid).update({
        stripeTestAccountId: account.id,
        stripeTestAccountCreated: new Date(),
        // In preview, use test account as primary
        stripeAccountId: account.id,
        stripeAccountCreated: new Date(),
      })

      console.log("✅ [Test Connect] Stored test account ID in Firestore")

      return NextResponse.json({
        success: true,
        accountId: account.id,
        message: "Test account created successfully",
        created: true,
        accountDetails: {
          type: account.type,
          country: account.country,
          email: account.email,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Test Connect] Stripe error creating account:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
      })

      return NextResponse.json(
        {
          error: "Failed to create test account",
          details: stripeError.message || "Unknown Stripe error",
          stripeError: {
            type: stripeError.type,
            code: stripeError.code,
            message: stripeError.message,
          },
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Test Connect] Error creating test account:", error)
    return NextResponse.json(
      {
        error: "Failed to create test account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
