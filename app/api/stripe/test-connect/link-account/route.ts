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
      return NextResponse.json({ error: "Invalid account ID format. Must start with 'acct_'" }, { status: 400 })
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
    console.log("🔍 [Test Connect] Stripe config:", {
      isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
      keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
    })

    try {
      // First, try to retrieve the account to verify it exists
      console.log("🔍 [Test Connect] Attempting to retrieve account:", accountId)

      const account = await stripe.accounts.retrieve(accountId)

      console.log("✅ [Test Connect] Account retrieved successfully:", {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        created: account.created,
      })

      // Check if account is in the correct mode (test vs live)
      const isTestAccount = !account.livemode
      console.log("🔍 [Test Connect] Account mode check:", {
        livemode: account.livemode,
        isTestAccount,
        expectedTestMode: true,
      })

      if (account.livemode) {
        return NextResponse.json(
          {
            error: "Cannot link live account in test environment",
            details: "This account appears to be a live account. Please use a test account ID.",
          },
          { status: 400 },
        )
      }

      // Update the account metadata to link it to our user
      console.log("🔄 [Test Connect] Updating account metadata...")

      const updatedAccount = await stripe.accounts.update(accountId, {
        metadata: {
          firebaseUid: uid,
          username: userData.username || "",
          environment: "test",
          linkedBy: "preview-test-flow",
          linkedAt: new Date().toISOString(),
          originalMetadata: JSON.stringify(account.metadata || {}),
        },
      })

      console.log("✅ [Test Connect] Updated account metadata:", updatedAccount.metadata)

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
      console.error("❌ [Test Connect] Stripe error details:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
      })

      // Provide more specific error messages based on Stripe error types
      let errorMessage = "Failed to verify account with Stripe"
      let errorDetails = stripeError.message || "Unknown error"

      if (stripeError.type === "invalid_request_error") {
        if (stripeError.code === "resource_missing") {
          errorMessage = "Account not found"
          errorDetails = "The provided account ID does not exist or is not accessible with your current API keys."
        } else if (stripeError.code === "account_invalid") {
          errorMessage = "Invalid account"
          errorDetails = "The account exists but cannot be accessed or modified."
        }
      } else if (stripeError.type === "authentication_error") {
        errorMessage = "Authentication error"
        errorDetails = "There was an issue with the Stripe API authentication."
      } else if (stripeError.type === "permission_error") {
        errorMessage = "Permission denied"
        errorDetails = "You don't have permission to access this account."
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
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
