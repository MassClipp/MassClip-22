import { NextRequest, NextResponse } from 'next/server'
import { ConnectedStripeAccountsService } from '@/lib/connected-stripe-accounts-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const refresh = searchParams.get('refresh') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let account = await ConnectedStripeAccountsService.getAccount(userId)

    if (!account) {
      return NextResponse.json({
        connected: false,
        fullySetup: false,
      })
    }

    // Refresh from Stripe if requested
    if (refresh) {
      const refreshedAccount = await ConnectedStripeAccountsService.refreshAccountFromStripe(userId)
      if (refreshedAccount) {
        account = refreshedAccount
      }
    }

    const fullySetup = ConnectedStripeAccountsService.isAccountFullySetup(account)

    return NextResponse.json({
      connected: true,
      fullySetup,
      account: {
        stripe_user_id: account.stripe_user_id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        country: account.country,
        email: account.email,
        business_type: account.business_type,
        livemode: account.livemode,
        connectedAt: account.connectedAt,
        lastUpdated: account.lastUpdated,
        requirements: account.requirements,
      },
    })

  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json({ error: 'Failed to check connection status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, refresh } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let account = await ConnectedStripeAccountsService.getAccount(userId)

    if (!account) {
      return NextResponse.json({
        connected: false,
        fullySetup: false,
      })
    }

    // Refresh from Stripe if requested
    if (refresh) {
      const refreshedAccount = await ConnectedStripeAccountsService.refreshAccountFromStripe(userId)
      if (refreshedAccount) {
        account = refreshedAccount
      }
    }

    const fullySetup = ConnectedStripeAccountsService.isAccountFullySetup(account)

    return NextResponse.json({
      connected: true,
      fullySetup,
      account: {
        stripe_user_id: account.stripe_user_id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        country: account.country,
        email: account.email,
        business_type: account.business_type,
        livemode: account.livemode,
        connectedAt: account.connectedAt,
        lastUpdated: account.lastUpdated,
        requirements: account.requirements,
      },
    })

  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json({ error: 'Failed to check connection status' }, { status: 500 })
  }
}
