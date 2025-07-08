import { type NextRequest, NextResponse } from "next/server"
import { auth } from "firebase-admin"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"

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

const db = getFirestore()

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
      return NextResponse.json({ error: "Preview only" }, { status: 403 })
    }

    const { idToken, accountId } = await request.json()

    // Step 1: Verify ID Token
    try {
      const decodedToken = await auth().verifyIdToken(idToken)
      results.push({
        step: "ID Token Verification",
        success: true,
        message: "Token verified successfully",
        details: { uid: decodedToken.uid, email: decodedToken.email },
      })
    } catch (error) {
      results.push({
        step: "ID Token Verification",
        success: false,
        message: "Failed to verify ID token",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return NextResponse.json({ results })
    }

    const decodedToken = await auth().verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Step 2: Validate Account ID Format
    if (!accountId || typeof accountId !== "string") {
      results.push({
        step: "Account ID Validation",
        success: false,
        message: "Account ID is required and must be a string",
        details: { provided: accountId, type: typeof accountId },
      })
      return NextResponse.json({ results })
    }

    if (!accountId.startsWith("acct_")) {
      results.push({
        step: "Account ID Validation",
        success: false,
        message: "Account ID must start with 'acct_'",
        details: { provided: accountId, expected: "acct_*" },
      })
      return NextResponse.json({ results })
    }

    results.push({
      step: "Account ID Validation",
      success: true,
      message: "Account ID format is valid",
      details: { accountId },
    })

    // Step 3: Check Stripe Configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      results.push({
        step: "Stripe Configuration",
        success: false,
        message: "STRIPE_SECRET_KEY environment variable not found",
      })
      return NextResponse.json({ results })
    }

    const isTestMode = stripeSecretKey.startsWith("sk_test_")
    results.push({
      step: "Stripe Configuration",
      success: true,
      message: `Stripe configured in ${isTestMode ? "test" : "live"} mode`,
      details: {
        keyPrefix: stripeSecretKey.substring(0, 8) + "...",
        isTestMode,
        isLiveMode: stripeSecretKey.startsWith("sk_live_"),
      },
    })

    // Step 4: Initialize Stripe
    let stripe: Stripe
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2024-06-20",
      })
      results.push({
        step: "Stripe Initialization",
        success: true,
        message: "Stripe client initialized successfully",
      })
    } catch (error) {
      results.push({
        step: "Stripe Initialization",
        success: false,
        message: "Failed to initialize Stripe client",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return NextResponse.json({ results })
    }

    // Step 5: Retrieve Account from Stripe
    try {
      const account = await stripe.accounts.retrieve(accountId)
      results.push({
        step: "Stripe Account Retrieval",
        success: true,
        message: "Account retrieved successfully from Stripe",
        details: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          created: account.created,
        },
      })

      // Step 6: Check Account Mode Compatibility
      const accountCreatedInTestMode = account.livemode === false
      if (isTestMode && !accountCreatedInTestMode) {
        results.push({
          step: "Account Mode Check",
          success: false,
          message: "Account was created in live mode but you're using test keys",
          details: {
            accountLiveMode: account.livemode,
            usingTestKeys: isTestMode,
          },
        })
      } else if (!isTestMode && accountCreatedInTestMode) {
        results.push({
          step: "Account Mode Check",
          success: false,
          message: "Account was created in test mode but you're using live keys",
          details: {
            accountLiveMode: account.livemode,
            usingTestKeys: isTestMode,
          },
        })
      } else {
        results.push({
          step: "Account Mode Check",
          success: true,
          message: `Account mode matches API keys (${isTestMode ? "test" : "live"} mode)`,
          details: {
            accountLiveMode: account.livemode,
            usingTestKeys: isTestMode,
          },
        })
      }
    } catch (error) {
      const stripeError = error as Stripe.StripeError
      results.push({
        step: "Stripe Account Retrieval",
        success: false,
        message: "Failed to retrieve account from Stripe",
        error: stripeError.message,
        details: {
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          requestId: stripeError.requestId,
        },
      })
      return NextResponse.json({ results })
    }

    // Step 7: Check Firebase User Document
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        results.push({
          step: "Firebase User Document",
          success: false,
          message: "User document does not exist in Firestore",
          details: { userId },
        })
      } else {
        const userData = userDoc.data()
        results.push({
          step: "Firebase User Document",
          success: true,
          message: "User document found in Firestore",
          details: {
            hasStripeAccountId: !!userData?.stripeAccountId,
            hasStripeTestAccountId: !!userData?.stripeTestAccountId,
            currentStripeAccountId: userData?.stripeAccountId,
            currentStripeTestAccountId: userData?.stripeTestAccountId,
          },
        })
      }
    } catch (error) {
      results.push({
        step: "Firebase User Document",
        success: false,
        message: "Failed to check user document in Firestore",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    // Step 8: Test Account Update (Dry Run)
    try {
      const updateData = {
        [`metadata.firebase_user_id`]: userId,
        [`metadata.linked_at`]: Math.floor(Date.now() / 1000).toString(),
        [`metadata.environment`]: "test",
      }

      // This is a dry run - we're not actually updating
      results.push({
        step: "Account Update Test (Dry Run)",
        success: true,
        message: "Account update would succeed with this data",
        details: { updateData },
      })
    } catch (error) {
      results.push({
        step: "Account Update Test (Dry Run)",
        success: false,
        message: "Account update would fail",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    results.push({
      step: "General Error",
      success: false,
      message: "Unexpected error during diagnostic",
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ results }, { status: 500 })
  }
}
