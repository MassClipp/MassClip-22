import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface CreateTestAccountBody {
  idToken: string
}

// Safe date formatting helper
function safeFormatDate(timestamp: number | null | undefined): string {
  if (!timestamp || typeof timestamp !== "number") {
    return new Date().toISOString()
  }

  try {
    // Stripe timestamps are in seconds, convert to milliseconds
    const date = new Date(timestamp * 1000)
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp: ${timestamp}`)
      return new Date().toISOString()
    }
    return date.toISOString()
  } catch (error) {
    console.warn(`Error formatting timestamp ${timestamp}:`, error)
    return new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as CreateTestAccountBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 401 },
      )
    }

    // Only allow test account creation in test mode
    if (!isTestMode) {
      return NextResponse.json(
        {
          success: false,
          error: "Test account creation is only available in test mode",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Create Test Account] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Create Test Account] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    // Check if user already has a test account
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    if (userData?.stripeTestAccountId) {
      console.log(`⚠️ [Create Test Account] User ${userId} already has test account: ${userData.stripeTestAccountId}`)

      // Verify the existing account still exists
      try {
        const existingAccount = await stripe.accounts.retrieve(userData.stripeTestAccountId)
        return NextResponse.json({
          success: true,
          account_id: existingAccount.id,
          message: "Test account already exists",
          account_details: {
            id: existingAccount.id,
            type: existingAccount.type,
            email: existingAccount.email,
            country: existingAccount.country,
            charges_enabled: existingAccount.charges_enabled,
            payouts_enabled: existingAccount.payouts_enabled,
            created: safeFormatDate(existingAccount.created),
          },
        })
      } catch (stripeError) {
        console.log(`🔄 [Create Test Account] Existing account not found, creating new one`)
        // Continue to create new account if existing one is not found
      }
    }

    try {
      // Create a new Stripe Connect account
      const account = await stripe.accounts.create({
        type: "standard",
        country: "US",
        email: userEmail,
        metadata: {
          firebase_uid: userId,
          created_by_platform: "massclip",
          environment: "test",
          created_at: new Date().toISOString(),
        },
      })

      console.log(`✅ [Create Test Account] Created Stripe account:`, {
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
      })

      // Save the account ID to Firestore
      await db.collection("users").doc(userId).set(
        {
          stripeTestAccountId: account.id,
          stripeTestConnected: true,
          stripeTestConnectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      console.log(`💾 [Create Test Account] Saved to Firestore for user ${userId}`)

      return NextResponse.json({
        success: true,
        account_id: account.id,
        message: "Test account created successfully",
        account_details: {
          id: account.id,
          type: account.type,
          email: account.email,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          created: safeFormatDate(account.created),
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            past_due: account.requirements?.past_due || [],
          },
        },
        next_steps: [
          "Complete account onboarding",
          "Submit required business information",
          "Verify identity documents",
        ],
      })
    } catch (stripeError: any) {
      console.error("❌ [Create Test Account] Stripe error:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create Stripe test account",
          details: stripeError.message,
          stripe_error_code: stripeError.code,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Create Test Account] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during test account creation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
