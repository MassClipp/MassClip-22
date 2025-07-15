import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface OnboardBody {
  idToken: string
  accountId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, accountId } = (await request.json()) as OnboardBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Onboard] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Onboard] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid
    let targetAccountId = accountId

    // If no account ID provided, check if user has one stored
    if (!targetAccountId) {
      const userDoc = await db.collection("users").doc(userId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()!
        const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
        targetAccountId = userData[accountIdField]
      }
    }

    // Create new account if none exists
    if (!targetAccountId) {
      console.log(`🆕 [Onboard] Creating new Stripe account for user ${userId}`)

      try {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US", // Default to US, can be changed during onboarding
          email: decodedToken.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        })

        targetAccountId = account.id
        console.log(`✅ [Onboard] Created new account: ${targetAccountId}`)

        // Save the new account ID
        const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: targetAccountId,
            updatedAt: new Date().toISOString(),
          })
      } catch (createError: any) {
        console.error("❌ [Onboard] Failed to create account:", createError)
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create Stripe account",
            details: createError.message,
          },
          { status: 500 },
        )
      }
    }

    // Create account link for onboarding
    try {
      const accountLink = await stripe.accountLinks.create({
        account: targetAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?refresh=true&account=${targetAccountId}`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/temp-stripe-connect?success=true&account=${targetAccountId}`,
        type: "account_onboarding",
      })

      console.log(`✅ [Onboard] Account link created for ${targetAccountId}`)

      return NextResponse.json({
        success: true,
        accountId: targetAccountId,
        onboardingUrl: accountLink.url,
        mode: isTestMode ? "test" : "live",
        message: "Onboarding link created successfully",
      })
    } catch (linkError: any) {
      console.error("❌ [Onboard] Failed to create account link:", linkError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create onboarding link",
          details: linkError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Onboard] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start onboarding process",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
