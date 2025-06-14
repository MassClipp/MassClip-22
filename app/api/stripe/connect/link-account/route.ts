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

      // Verify the account exists and get its details
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId)

        // Update user profile with Stripe account ID
        await db
          .collection("users")
          .doc(user.uid)
          .update({
            stripeAccountId: stripeAccountId,
            stripeAccountStatus: {
              chargesEnabled: account.charges_enabled,
              payoutsEnabled: account.payouts_enabled,
              detailsSubmitted: account.details_submitted,
              requirementsCount:
                (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
              currentlyDue: account.requirements?.currently_due || [],
              pastDue: account.requirements?.past_due || [],
              lastUpdated: new Date(),
            },
            updatedAt: new Date(),
          })

        console.log(`✅ Linked Stripe account ${stripeAccountId} to user ${user.uid}`)

        return NextResponse.json({
          success: true,
          message: "Stripe account linked successfully",
          accountId: stripeAccountId,
          accountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          },
        })
      } catch (stripeError: any) {
        console.error("Stripe account verification failed:", stripeError)
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Stripe account",
            details: stripeError.message,
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

    // Verify the account exists and get its details
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      // Update user profile with Stripe account ID
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          stripeAccountId: stripeAccountId,
          stripeAccountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            requirementsCount:
              (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
            currentlyDue: account.requirements?.currently_due || [],
            pastDue: account.requirements?.past_due || [],
            lastUpdated: new Date(),
          },
          updatedAt: new Date(),
        })

      console.log(`✅ Linked Stripe account ${stripeAccountId} to user ${user.uid}`)

      return NextResponse.json({
        success: true,
        message: "Stripe account linked successfully",
        accountId: stripeAccountId,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        },
      })
    } catch (stripeError: any) {
      console.error("Stripe account verification failed:", stripeError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Stripe account",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("Error linking Stripe account:", error)
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
