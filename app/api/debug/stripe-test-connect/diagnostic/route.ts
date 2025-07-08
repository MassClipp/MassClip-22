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
  try {
    const { idToken, accountId } = await request.json()
    const results: TestResult[] = []

    // Step 1: Environment Check
    results.push({
      step: "Environment Check",
      success: process.env.VERCEL_ENV === "preview",
      message: process.env.VERCEL_ENV === "preview" ? "Running in preview environment" : "Not in preview environment",
      details: {
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV,
      },
    })

    // Step 2: Stripe Key Check
    const hasTestKey = !!process.env.STRIPE_SECRET_KEY_TEST
    const currentKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    const isUsingTestKey = currentKey?.startsWith("sk_test_")

    results.push({
      step: "Stripe Key Configuration",
      success: hasTestKey && isUsingTestKey,
      message: hasTestKey
        ? isUsingTestKey
          ? "Using test Stripe keys"
          : "Has test key but using live key"
        : "Missing test Stripe keys",
      details: {
        hasTestKey,
        hasLiveKey: !!process.env.STRIPE_SECRET_KEY,
        currentKeyPrefix: currentKey?.substring(0, 7),
        isUsingTestKey,
      },
    })

    if (!idToken) {
      results.push({
        step: "Authentication",
        success: false,
        message: "No ID token provided",
      })
      return NextResponse.json({ results })
    }

    // Step 3: Firebase Auth
    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      results.push({
        step: "Firebase Authentication",
        success: true,
        message: "Successfully verified ID token",
        details: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      })

      // Step 4: User Profile Check
      const userDoc = await db.collection("users").doc(decodedToken.uid).get()
      results.push({
        step: "User Profile Check",
        success: userDoc.exists,
        message: userDoc.exists ? "User profile found" : "User profile not found",
        details: userDoc.exists
          ? {
              hasStripeAccount: !!userDoc.data()?.stripeAccountId,
              hasTestAccount: !!userDoc.data()?.stripeTestAccountId,
            }
          : null,
      })

      if (!accountId) {
        results.push({
          step: "Account ID Validation",
          success: false,
          message: "No account ID provided for testing",
        })
        return NextResponse.json({ results })
      }

      // Step 5: Account ID Format
      const isValidFormat = accountId.startsWith("acct_")
      results.push({
        step: "Account ID Format",
        success: isValidFormat,
        message: isValidFormat ? "Valid account ID format" : "Invalid account ID format",
        details: {
          accountId,
          expectedPrefix: "acct_",
        },
      })

      if (!isValidFormat) {
        return NextResponse.json({ results })
      }

      // Step 6: Stripe Account Retrieval
      try {
        const account = await stripe.accounts.retrieve(accountId)
        results.push({
          step: "Stripe Account Retrieval",
          success: true,
          message: "Successfully retrieved account from Stripe",
          details: {
            accountId: account.id,
            type: account.type,
            country: account.country,
            email: account.email,
            livemode: account.livemode,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          },
        })

        // Step 7: Account Mode Check
        const isTestAccount = !account.livemode
        results.push({
          step: "Account Mode Verification",
          success: isTestAccount,
          message: isTestAccount ? "Account is in test mode" : "Account is in live mode",
          details: {
            livemode: account.livemode,
            expectedTestMode: true,
          },
        })

        // Step 8: Account Update Test
        if (isTestAccount) {
          try {
            await stripe.accounts.update(accountId, {
              metadata: {
                testUpdate: new Date().toISOString(),
              },
            })
            results.push({
              step: "Account Update Test",
              success: true,
              message: "Successfully updated account metadata",
            })
          } catch (updateError: any) {
            results.push({
              step: "Account Update Test",
              success: false,
              message: "Failed to update account metadata",
              error: updateError.message,
              details: {
                type: updateError.type,
                code: updateError.code,
              },
            })
          }
        }
      } catch (stripeError: any) {
        results.push({
          step: "Stripe Account Retrieval",
          success: false,
          message: "Failed to retrieve account from Stripe",
          error: stripeError.message,
          details: {
            type: stripeError.type,
            code: stripeError.code,
            statusCode: stripeError.statusCode,
          },
        })
      }
    } catch (authError: any) {
      results.push({
        step: "Firebase Authentication",
        success: false,
        message: "Failed to verify ID token",
        error: authError.message,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Diagnostic error:", error)
    return NextResponse.json(
      {
        error: "Failed to run diagnostic",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
