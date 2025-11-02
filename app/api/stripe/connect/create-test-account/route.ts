import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface CreateTestAccountBody {
  idToken: string
  email?: string
  country?: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, email, country = "US" } = (await request.json()) as CreateTestAccountBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 401 },
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

    if (!isTestMode) {
      return NextResponse.json({
        success: false,
        error: "Test account creation is only available in test mode",
        current_mode: "live",
      })
    }

    console.log(`🏗️ [Create Test Account] Creating test account for user ${userId}`)

    try {
      // Create a new Stripe Connect account
      const account = await stripe.accounts.create({
        type: "standard",
        country: country,
        email: email || decodedToken.email || undefined,
        metadata: {
          created_by_platform: "massclip",
          firebase_uid: userId,
          created_at: new Date().toISOString(),
          platform_environment: "test",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        settings: {
          payouts: {
            schedule: {
              interval: "manual",
            },
          },
        },
      })

      console.log(`✅ [Create Test Account] Account created:`, {
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
      })

      // Save the test account to Firestore
      const updateData = {
        stripeTestAccountId: account.id,
        stripeTestConnected: true,
        stripeTestConnectedAt: new Date().toISOString(),
        stripeTestAccountType: account.type,
        stripeTestAccountEmail: account.email,
        stripeTestAccountCountry: account.country,
        updatedAt: new Date().toISOString(),
      }

      await db.collection("users").doc(userId).set(updateData, { merge: true })

      console.log(`💾 [Create Test Account] Saved to Firestore for user ${userId}`)

      return NextResponse.json({
        success: true,
        account_created: true,
        account_id: account.id,
        message: "Test Stripe account created and connected successfully",
        account_details: {
          id: account.id,
          type: account.type,
          email: account.email,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          livemode: account.livemode,
        },
        connection_info: {
          connected_at: new Date().toISOString(),
          user_id: userId,
          environment: "test",
        },
        next_steps: [
          "Complete account onboarding in Stripe Dashboard",
          "Submit required business information",
          "Verify identity documents if required",
        ],
      })
    } catch (stripeError: any) {
      console.error("❌ [Create Test Account] Stripe error:", stripeError)
      return NextResponse.json({
        success: false,
        error: "Failed to create test account",
        details: stripeError.message,
        stripe_error_code: stripeError.code,
      })
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
