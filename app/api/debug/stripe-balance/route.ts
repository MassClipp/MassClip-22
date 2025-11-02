export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const body = await request.json()

    if (body.action !== "get_balance") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Get user's Stripe account ID
    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        success: false,
        error: "No Stripe account found",
        details: "User does not have a connected Stripe account",
      })
    }

    const stripeAccountId = userData.stripeAccountId

    try {
      // Get balance from Stripe
      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      })

      // Get account info for additional context
      const account = await stripe.accounts.retrieve(stripeAccountId)

      return NextResponse.json({
        success: true,
        data: {
          balance: {
            available: balance.available.map((bal) => ({
              amount: bal.amount / 100,
              currency: bal.currency,
            })),
            pending: balance.pending.map((bal) => ({
              amount: bal.amount / 100,
              currency: bal.currency,
            })),
            reserved: balance.reserved?.map((bal) => ({
              amount: bal.amount / 100,
              currency: bal.currency,
            })),
          },
          account: {
            id: account.id,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            country: account.country,
            defaultCurrency: account.default_currency,
            requirements: {
              currentlyDue: account.requirements?.currently_due || [],
              pastDue: account.requirements?.past_due || [],
            },
          },
          stripeAccountId,
        },
      })
    } catch (stripeError: any) {
      return NextResponse.json({
        success: false,
        error: "Stripe API error",
        details: stripeError.message,
        stripeAccountId,
      })
    }
  } catch (error: any) {
    console.error("Debug balance error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
