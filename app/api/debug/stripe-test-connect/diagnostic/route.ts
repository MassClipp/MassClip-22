import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

interface TestResult {
  step: string
  success: boolean
  message: string
  details?: any
  error?: string
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = []

  try {
    // Only allow in preview environment
    if (process.env.VERCEL_ENV !== "preview") {
      results.push({
        step: "Environment Check",
        success: false,
        message: "Not in preview environment",
        details: { vercelEnv: process.env.VERCEL_ENV },
      })
      return NextResponse.json({ results }, { status: 403 })
    }

    results.push({
      step: "Environment Check",
      success: true,
      message: "Preview environment confirmed",
      details: { vercelEnv: process.env.VERCEL_ENV },
    })

    const { idToken, accountId } = await request.json()

    // Step 1: Validate inputs
    if (!idToken || !accountId) {
      results.push({
        step: "Input Validation",
        success: false,
        message: "Missing required parameters",
        details: { hasIdToken: !!idToken, hasAccountId: !!accountId },
      })
      return NextResponse.json({ results }, { status: 400 })
    }

    if (!accountId.startsWith("acct_")) {
      results.push({
        step: "Input Validation",
        success: false,
        message: "Invalid account ID format",
        details: { accountId, expectedPrefix: "acct_" },
      })
      return NextResponse.json({ results }, { status: 400 })
    }

    results.push({
      step: "Input Validation",
      success: true,
      message: "All inputs valid",
      details: { accountId: accountId.substring(0, 12) + "..." },
    })

    // Step 2: Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      results.push({
        step: "Firebase Auth",
        success: true,
        message: "Token verified successfully",
        details: { uid: decodedToken.uid, email: decodedToken.email },
      })
    } catch (authError: any) {
      results.push({
        step: "Firebase Auth",
        success: false,
        message: "Token verification failed",
        error: authError.message,
      })
      return NextResponse.json({ results }, { status: 401 })
    }

    // Step 3: Check user exists in Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get()
    if (!userDoc.exists) {
      results.push({
        step: "User Lookup",
        success: false,
        message: "User not found in Firestore",
        details: { uid: decodedToken.uid },
      })
      return NextResponse.json({ results }, { status: 404 })
    }

    const userData = userDoc.data()!
    results.push({
      step: "User Lookup",
      success: true,
      message: "User found in Firestore",
      details: {
        uid: decodedToken.uid,
        username: userData.username,
        hasStripeAccount: !!userData.stripeAccountId,
        hasTestAccount: !!userData.stripeTestAccountId,
      },
    })

    // Step 4: Check Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    const isTestMode = stripeSecretKey?.startsWith("sk_test_")
    const isLiveMode = stripeSecretKey?.startsWith("sk_live_")

    results.push({
      step: "Stripe Configuration",
      success: !!stripeSecretKey,
      message: stripeSecretKey ? "Stripe key available" : "No Stripe key found",
      details: {
        hasSecretKey: !!stripeSecretKey,
        keyPrefix: stripeSecretKey?.substring(0, 7),
        isTestMode,
        isLiveMode,
        hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
        hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
      },
    })

    if (!stripeSecretKey) {
      return NextResponse.json({ results }, { status: 500 })
    }

    // Step 5: Test Stripe API connection
    try {
      const balance = await stripe.balance.retrieve()
      results.push({
        step: "Stripe API Connection",
        success: true,
        message: "Stripe API accessible",
        details: {
          available: balance.available.length,
          pending: balance.pending.length,
          livemode: balance.livemode,
        },
      })
    } catch (stripeError: any) {
      results.push({
        step: "Stripe API Connection",
        success: false,
        message: "Stripe API connection failed",
        error: stripeError.message,
        details: {
          type: stripeError.type,
          code: stripeError.code,
        },
      })
      return NextResponse.json({ results }, { status: 500 })
    }

    // Step 6: Try to retrieve the account
    try {
      const account = await stripe.accounts.retrieve(accountId)
      results.push({
        step: "Account Retrieval",
        success: true,
        message: "Account retrieved successfully",
        details: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          livemode: account.livemode,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          metadata: account.metadata,
        },
      })

      // Step 7: Check account mode compatibility
      if (account.livemode && isTestMode) {
        results.push({
          step: "Mode Compatibility",
          success: false,
          message: "Live account cannot be accessed with test keys",
          details: {
            accountMode: "live",
            apiMode: "test",
            compatible: false,
          },
        })
        return NextResponse.json({ results }, { status: 400 })
      }

      if (!account.livemode && isLiveMode) {
        results.push({
          step: "Mode Compatibility",
          success: false,
          message: "Test account cannot be accessed with live keys",
          details: {
            accountMode: "test",
            apiMode: "live",
            compatible: false,
          },
        })
        return NextResponse.json({ results }, { status: 400 })
      }

      results.push({
        step: "Mode Compatibility",
        success: true,
        message: "Account mode compatible with API keys",
        details: {
          accountMode: account.livemode ? "live" : "test",
          apiMode: isTestMode ? "test" : "live",
          compatible: true,
        },
      })

      // Step 8: Try to update account metadata
      try {
        const updatedAccount = await stripe.accounts.update(accountId, {
          metadata: {
            firebaseUid: decodedToken.uid,
            username: userData.username || "",
            environment: "test",
            linkedBy: "diagnostic-test",
            linkedAt: new Date().toISOString(),
          },
        })

        results.push({
          step: "Account Update",
          success: true,
          message: "Account metadata updated successfully",
          details: {
            updatedMetadata: updatedAccount.metadata,
          },
        })

        // Step 9: Try to update Firestore
        try {
          await db.collection("users").doc(decodedToken.uid).update({
            stripeTestAccountId: accountId,
            stripeTestAccountLinked: new Date(),
            stripeAccountId: accountId, // Use as primary in preview
            diagnosticTest: new Date(),
          })

          results.push({
            step: "Firestore Update",
            success: true,
            message: "User profile updated successfully",
            details: {
              uid: decodedToken.uid,
              accountId,
            },
          })

          results.push({
            step: "Overall Result",
            success: true,
            message: "All tests passed - account linking should work",
          })
        } catch (firestoreError: any) {
          results.push({
            step: "Firestore Update",
            success: false,
            message: "Failed to update user profile",
            error: firestoreError.message,
          })
        }
      } catch (updateError: any) {
        results.push({
          step: "Account Update",
          success: false,
          message: "Failed to update account metadata",
          error: updateError.message,
          details: {
            type: updateError.type,
            code: updateError.code,
          },
        })
      }
    } catch (retrieveError: any) {
      results.push({
        step: "Account Retrieval",
        success: false,
        message: "Failed to retrieve account",
        error: retrieveError.message,
        details: {
          type: retrieveError.type,
          code: retrieveError.code,
          statusCode: retrieveError.statusCode,
          requestId: retrieveError.requestId,
        },
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    results.push({
      step: "Diagnostic Error",
      success: false,
      message: "Diagnostic failed with unexpected error",
      error: error instanceof Error ? error.message : "Unknown error",
    })

    return NextResponse.json({ results }, { status: 500 })
  }
}
