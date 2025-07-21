export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Get user from multiple auth methods
    let user
    try {
      user = await getAuthenticatedUser(request.headers)
    } catch (authError) {
      console.error("Primary auth failed, trying alternative methods:", authError)

      // Try to get user ID from request body
      const body = await request.json()
      const { idToken, stripeAccountId } = body

      if (!idToken) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
      }

      // Verify the ID token directly
      const { auth } = await import("@/lib/firebase-admin")
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        user = { uid: decodedToken.uid }
      } catch (tokenError) {
        console.error("Token verification failed:", tokenError)
        return NextResponse.json({ success: false, error: "Invalid authentication token" }, { status: 401 })
      }

      if (!stripeAccountId) {
        return NextResponse.json({ success: false, error: "Stripe account ID is required" }, { status: 400 })
      }

      // Enhanced account validation with detailed error reporting
      try {
        console.log(`🔍 Validating Stripe account: ${stripeAccountId}`)

        const account = await stripe.accounts.retrieve(stripeAccountId)
        console.log(`✅ Account retrieved successfully:`, {
          id: account.id,
          type: account.type,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        })

        // Check if account belongs to our platform
        const isConnectedAccount = account.type === "express" || account.type === "custom"
        console.log(`🔗 Account type check: ${account.type}, isConnectedAccount: ${isConnectedAccount}`)

        // Update user profile with Stripe account ID
        const updateData = {
          stripeAccountId: stripeAccountId,
          stripeAccountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            accountType: account.type,
            country: account.country,
            requirementsCount:
              (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
            currentlyDue: account.requirements?.currently_due || [],
            pastDue: account.requirements?.past_due || [],
            lastUpdated: new Date(),
          },
          updatedAt: new Date(),
        }

        await db.collection("users").doc(user.uid).update(updateData)

        console.log(`✅ Successfully linked Stripe account ${stripeAccountId} to user ${user.uid}`)

        return NextResponse.json({
          success: true,
          message: "Stripe account linked successfully",
          accountId: stripeAccountId,
          accountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            accountType: account.type,
            country: account.country,
          },
        })
      } catch (stripeError: any) {
        console.error("❌ Stripe account validation failed:", {
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          accountId: stripeAccountId,
        })

        // Provide specific error messages based on Stripe error types
        let errorMessage = "Invalid Stripe account"
        if (stripeError.type === "StripeInvalidRequestError") {
          if (stripeError.code === "resource_missing") {
            errorMessage = "Stripe account not found. Please check the account ID."
          } else if (stripeError.code === "account_invalid") {
            errorMessage = "This Stripe account cannot be connected to our platform."
          }
        } else if (stripeError.type === "StripePermissionError") {
          errorMessage = "Permission denied. This account may not belong to you or may already be connected elsewhere."
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: stripeError.message,
            stripeErrorType: stripeError.type,
            stripeErrorCode: stripeError.code,
          },
          { status: 400 },
        )
      }
    }

    // Original flow if primary auth worked
    const body = await request.json()
    const { stripeAccountId } = body

    if (!stripeAccountId) {
      return NextResponse.json({ success: false, error: "Stripe account ID is required" }, { status: 400 })
    }

    // Enhanced account validation with detailed error reporting
    try {
      console.log(`🔍 Validating Stripe account: ${stripeAccountId}`)

      const account = await stripe.accounts.retrieve(stripeAccountId)
      console.log(`✅ Account retrieved successfully:`, {
        id: account.id,
        type: account.type,
        country: account.country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      // Update user profile with Stripe account ID
      const updateData = {
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          accountType: account.type,
          country: account.country,
          requirementsCount:
            (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
          currentlyDue: account.requirements?.currently_due || [],
          pastDue: account.requirements?.past_due || [],
          lastUpdated: new Date(),
        },
        updatedAt: new Date(),
      }

      await db.collection("users").doc(user.uid).update(updateData)

      console.log(`✅ Successfully linked Stripe account ${stripeAccountId} to user ${user.uid}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully",
        accountId: stripeAccountId,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          accountType: account.type,
          country: account.country,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ Stripe account validation failed:", {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        accountId: stripeAccountId,
      })

      // Provide specific error messages based on Stripe error types
      let errorMessage = "Invalid Stripe account"
      if (stripeError.type === "StripeInvalidRequestError") {
        if (stripeError.code === "resource_missing") {
          errorMessage = "Stripe account not found. Please check the account ID."
        } else if (stripeError.code === "account_invalid") {
          errorMessage = "This Stripe account cannot be connected to our platform."
        }
      } else if (stripeError.type === "StripePermissionError") {
        errorMessage = "Permission denied. This account may not belong to you or may already be connected elsewhere."
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: stripeError.message,
          stripeErrorType: stripeError.type,
          stripeErrorCode: stripeError.code,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ Unexpected error linking Stripe account:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to link Stripe account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
