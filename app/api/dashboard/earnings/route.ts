import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Earnings API] Starting earnings fetch...")

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request.headers)
    const userId = authUser.uid

    console.log(`🔍 [Earnings API] Fetching earnings for user: ${userId}`)

    // Get Stripe account info from connectedStripeAccounts collection
    const stripeAccountDoc = await adminDb.collection("connectedStripeAccounts").doc(userId).get()
    
    let stripeAccountStatus = {
      connected: false,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements: [] as string[]
    }

    let stripeAccountId: string | null = null

    if (stripeAccountDoc.exists) {
      const accountData = stripeAccountDoc.data()!
      stripeAccountId = accountData.stripeAccountId
      
      stripeAccountStatus = {
        connected: true,
        charges_enabled: accountData.charges_enabled || false,
        payouts_enabled: accountData.payouts_enabled || false,
        details_submitted: accountData.details_submitted || false,
        requirements: accountData.requirements || []
      }

      console.log(`✅ [Earnings API] Found connected Stripe account: ${stripeAccountId}`)
    } else {
      console.log(`ℹ️ [Earnings API] No connected Stripe account found for user: ${userId}`)
    }

    // Initialize earnings data
    let totalEarnings = 0
    let monthlyEarnings = 0
    let pendingPayouts = 0
    let completedPayouts = 0
    let recentTransactions: any[] = []

    // If we have a connected Stripe account, fetch earnings data
    if (stripeAccountId && stripeAccountStatus.connected) {
      try {
        console.log(`💰 [Earnings API] Fetching earnings data from Stripe for account: ${stripeAccountId}`)

        // Get balance (available and pending)
        const balance = await stripe.balance.retrieve({
          stripeAccount: stripeAccountId,
        })

        // Calculate totals from balance
        pendingPayouts = balance.pending.reduce((sum, item) => sum + item.amount, 0)
        const availableBalance = balance.available.reduce((sum, item) => sum + item.amount, 0)

        // Get payouts to calculate completed payouts
        const payouts = await stripe.payouts.list(
          { limit: 100 },
          { stripeAccount: stripeAccountId }
        )

        completedPayouts = payouts.data
          .filter(payout => payout.status === 'paid')
          .reduce((sum, payout) => sum + payout.amount, 0)

        // Get charges for total earnings and monthly earnings
        const charges = await stripe.charges.list(
          { limit: 100 },
          { stripeAccount: stripeAccountId }
        )

        const successfulCharges = charges.data.filter(charge => charge.status === 'succeeded')
        totalEarnings = successfulCharges.reduce((sum, charge) => sum + charge.amount, 0)

        // Calculate monthly earnings (current month)
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        
        monthlyEarnings = successfulCharges
          .filter(charge => {
            const chargeDate = new Date(charge.created * 1000)
            return chargeDate.getMonth() === currentMonth && chargeDate.getFullYear() === currentYear
          })
          .reduce((sum, charge) => sum + charge.amount, 0)

        // Get recent transactions
        recentTransactions = successfulCharges.slice(0, 10).map(charge => ({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          created: charge.created,
          description: charge.description || `Payment from ${charge.billing_details?.name || 'customer'}`
        }))

        console.log(`✅ [Earnings API] Successfully fetched earnings data:`, {
          totalEarnings,
          monthlyEarnings,
          pendingPayouts,
          completedPayouts,
          transactionCount: recentTransactions.length
        })

      } catch (stripeError: any) {
        console.error("❌ [Earnings API] Error fetching Stripe data:", stripeError)
        // Continue with default values - don't fail the entire request
      }
    }

    const response = {
      totalEarnings,
      monthlyEarnings,
      pendingPayouts,
      completedPayouts,
      recentTransactions,
      stripeAccountStatus
    }

    console.log(`✅ [Earnings API] Returning earnings data for user: ${userId}`)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error("❌ [Earnings API] Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch earnings data",
        details: error.message,
        totalEarnings: 0,
        monthlyEarnings: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        recentTransactions: [],
        stripeAccountStatus: {
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: []
        }
      },
      { status: 500 }
    )
  }
}
