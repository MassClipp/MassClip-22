export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const debugSteps: any[] = []

    // Step 1: Check user profile for Stripe account
    debugSteps.push({ step: 1, action: "Checking user profile for Stripe account..." })

    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.data()

    debugSteps.push({
      step: 1,
      result: "success",
      data: {
        userExists: userDoc.exists,
        stripeAccountId: userData?.stripeAccountId || null,
        userDataKeys: userData ? Object.keys(userData) : [],
      },
    })

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        success: false,
        error: "No Stripe account ID found in user profile",
        debugSteps,
        recommendation: "Check if the account linking was successful",
      })
    }

    const stripeAccountId = userData.stripeAccountId

    // Step 2: Test Stripe account access
    debugSteps.push({ step: 2, action: "Testing Stripe account access..." })

    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)
      debugSteps.push({
        step: 2,
        result: "success",
        data: {
          accountId: account.id,
          country: account.country,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements,
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 2,
        result: "error",
        error: error.message,
        stripeAccountId,
      })
      return NextResponse.json({
        success: false,
        error: "Cannot access Stripe account",
        debugSteps,
        recommendation: "Check if the Stripe account ID is valid",
      })
    }

    // Step 3: Get balance
    debugSteps.push({ step: 3, action: "Fetching Stripe balance..." })

    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      })

      const availableBalance = balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100
      const pendingBalance = balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100

      debugSteps.push({
        step: 3,
        result: "success",
        data: {
          available: balance.available,
          pending: balance.pending,
          reserved: balance.reserved,
          availableBalance,
          pendingBalance,
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 3,
        result: "error",
        error: error.message,
      })
    }

    // Step 4: Get balance transactions
    debugSteps.push({ step: 4, action: "Fetching balance transactions..." })

    try {
      const transactions = await stripe.balanceTransactions.list({ limit: 100 }, { stripeAccount: stripeAccountId })

      const paymentTransactions = transactions.data.filter((txn) => txn.type === "payment")
      const totalEarnings = paymentTransactions.reduce((sum, txn) => sum + txn.net, 0) / 100

      // Calculate this month earnings
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      const thisMonthTimestamp = Math.floor(thisMonth.getTime() / 1000)

      const thisMonthTransactions = paymentTransactions.filter((txn) => txn.created >= thisMonthTimestamp)
      const thisMonthEarnings = thisMonthTransactions.reduce((sum, txn) => sum + txn.net, 0) / 100

      debugSteps.push({
        step: 4,
        result: "success",
        data: {
          totalTransactions: transactions.data.length,
          paymentTransactions: paymentTransactions.length,
          totalEarnings,
          thisMonthEarnings,
          rawTransactions: transactions.data.slice(0, 5).map((txn) => ({
            id: txn.id,
            type: txn.type,
            amount: txn.amount / 100,
            net: txn.net / 100,
            fee: txn.fee / 100,
            created: new Date(txn.created * 1000),
            description: txn.description,
          })),
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 4,
        result: "error",
        error: error.message,
      })
    }

    // Step 5: Get charges
    debugSteps.push({ step: 5, action: "Fetching charges..." })

    try {
      const charges = await stripe.charges.list({ limit: 100 }, { stripeAccount: stripeAccountId })

      const successfulCharges = charges.data.filter((charge) => charge.status === "succeeded")
      const totalChargeAmount = successfulCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100

      debugSteps.push({
        step: 5,
        result: "success",
        data: {
          totalCharges: charges.data.length,
          successfulCharges: successfulCharges.length,
          totalChargeAmount,
          rawCharges: charges.data.slice(0, 5).map((charge) => ({
            id: charge.id,
            amount: charge.amount / 100,
            status: charge.status,
            created: new Date(charge.created * 1000),
            description: charge.description,
            paid: charge.paid,
          })),
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 5,
        result: "error",
        error: error.message,
      })
    }

    // Step 6: Get payouts
    debugSteps.push({ step: 6, action: "Fetching payouts..." })

    try {
      const payouts = await stripe.payouts.list({ limit: 50 }, { stripeAccount: stripeAccountId })

      debugSteps.push({
        step: 6,
        result: "success",
        data: {
          totalPayouts: payouts.data.length,
          rawPayouts: payouts.data.slice(0, 5).map((payout) => ({
            id: payout.id,
            amount: payout.amount / 100,
            status: payout.status,
            created: new Date(payout.created * 1000),
            arrivalDate: new Date(payout.arrival_date * 1000),
          })),
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 6,
        result: "error",
        error: error.message,
      })
    }

    // Step 7: Test the earnings service directly
    debugSteps.push({ step: 7, action: "Testing StripeEarningsService..." })

    try {
      const { StripeEarningsService } = await import("@/lib/stripe-earnings-service")
      const earningsData = await StripeEarningsService.getEarningsData(user.uid)

      debugSteps.push({
        step: 7,
        result: "success",
        data: {
          serviceReturned: !!earningsData,
          totalEarnings: earningsData?.totalEarnings || 0,
          thisMonthEarnings: earningsData?.thisMonthEarnings || 0,
          availableBalance: earningsData?.availableBalance || 0,
          error: earningsData?.error || null,
          hasTransactions: earningsData?.recentTransactions?.length || 0,
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 7,
        result: "error",
        error: error.message,
      })
    }

    // Step 8: Check cached data
    debugSteps.push({ step: 8, action: "Checking cached earnings data..." })

    try {
      const cachedDoc = await db.collection("users").doc(user.uid).collection("stripe_data").doc("earnings").get()

      debugSteps.push({
        step: 8,
        result: "success",
        data: {
          cacheExists: cachedDoc.exists,
          cachedData: cachedDoc.exists ? cachedDoc.data() : null,
        },
      })
    } catch (error: any) {
      debugSteps.push({
        step: 8,
        result: "error",
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      debugSteps,
      summary: {
        stripeAccountId,
        stepsCompleted: debugSteps.filter((step) => step.result === "success").length,
        stepsWithErrors: debugSteps.filter((step) => step.result === "error").length,
      },
    })
  } catch (error: any) {
    console.error("Earnings flow debug error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Debug process failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
