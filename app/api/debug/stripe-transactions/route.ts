export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const body = await request.json()

    if (body.action !== "get_transactions") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const limit = body.limit || 10

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
      // Get balance transactions
      const balanceTransactions = await stripe.balanceTransactions.list(
        {
          limit: limit,
          expand: ["data.source"],
        },
        {
          stripeAccount: stripeAccountId,
        },
      )

      // Get charges for additional context
      const charges = await stripe.charges.list(
        {
          limit: limit,
        },
        {
          stripeAccount: stripeAccountId,
        },
      )

      // Get payouts
      const payouts = await stripe.payouts.list(
        {
          limit: 10,
        },
        {
          stripeAccount: stripeAccountId,
        },
      )

      const processedTransactions = balanceTransactions.data.map((txn) => ({
        id: txn.id,
        amount: txn.amount / 100,
        net: txn.net / 100,
        fee: txn.fee / 100,
        type: txn.type,
        status: txn.status,
        description: txn.description,
        created: new Date(txn.created * 1000),
        currency: txn.currency,
        source: txn.source,
      }))

      const processedCharges = charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        status: charge.status,
        description: charge.description,
        created: new Date(charge.created * 1000),
        currency: charge.currency,
        paid: charge.paid,
        refunded: charge.refunded,
      }))

      const processedPayouts = payouts.data.map((payout) => ({
        id: payout.id,
        amount: payout.amount / 100,
        status: payout.status,
        created: new Date(payout.created * 1000),
        arrivalDate: new Date(payout.arrival_date * 1000),
        currency: payout.currency,
        method: payout.method,
      }))

      // Calculate some basic stats
      const paymentTransactions = balanceTransactions.data.filter((txn) => txn.type === "payment")
      const totalEarnings = paymentTransactions.reduce((sum, txn) => sum + txn.net, 0) / 100

      return NextResponse.json({
        success: true,
        data: {
          transactions: processedTransactions,
          charges: processedCharges,
          payouts: processedPayouts,
          stats: {
            totalTransactions: balanceTransactions.data.length,
            paymentTransactions: paymentTransactions.length,
            totalEarnings,
            totalCharges: charges.data.length,
            totalPayouts: payouts.data.length,
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
    console.error("Debug transactions error:", error)
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
