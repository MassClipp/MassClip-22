import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Test account linking only available in preview environment" }, { status: 403 })
    }

    const { idToken, accountId } = await request.json()

    if (!idToken || !accountId) {
      return NextResponse.json({ error: "ID token and account ID are required" }, { status: 400 })
    }

    // Validate account ID format
    if (!accountId.startsWith("acct_")) {
      return NextResponse.json({ error: "Invalid account ID format" }, { status: 400 })
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

    console.log("🔗 [Test Connect] Linking test account:", accountId, "to user:", uid)

    try {
      // Verify the account exists and is accessible
      const account = await stripe.accounts.retrieve(accountId)

      // Check if it's a test account (in test mode, all accounts are test accounts)
      console.log("✅ [Test Connect] Account verified:", {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
      })

      // Update the account metadata to link it to our user
      await stripe.accounts.update(accountId, {
        metadata: {
          firebaseUid: uid,
          username: userData.username || "",
          environment: "test",
          linkedBy: "preview-test-flow",
          linkedAt: new Date().toISOString(),
        },
      })

      console.log("✅ [Test Connect] Updated account metadata")
    } catch (stripeError: any) {
      console.error("❌ [Test Connect] Stripe error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to verify account with Stripe",
          details: stripeError.message || "Account not found or inaccessible",
        },
        { status: 400 },
      )
    }

    // Store the linked test account ID in Firestore
    await db.collection("users").doc(uid).update({
      stripeTestAccountId: accountId,
      stripeTestAccountLinked: new Date(),
      // In preview, use test account as primary
      stripeAccountId: accountId,
      stripeAccountCreated: new Date(),
    })

    console.log("✅ [Test Connect] Stored linked test account ID in Firestore")

    return NextResponse.json({
      success: true,
      accountId: accountId,
      message: "Test account linked successfully",
      linked: true,
    })
  } catch (error) {
    console.error("❌ [Test Connect] Error linking test account:", error)
    return NextResponse.json(
      {
        error: "Failed to link test account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
