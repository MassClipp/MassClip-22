import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { bundleId, creatorId } = await request.json()

    console.log(`🔍 [Debug] Testing checkout prerequisites for bundle: ${bundleId}`)

    // Check if bundle exists
    const bundleDoc = await adminDb.collection('bundles').doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Bundle not found',
        details: { bundleId }
      })
    }

    const bundleData = bundleDoc.data()
    console.log(`✅ [Debug] Bundle found:`, {
      id: bundleId,
      title: bundleData?.title,
      price: bundleData?.price,
      stripeProductId: bundleData?.stripeProductId,
      stripePriceId: bundleData?.stripePriceId
    })

    // Check creator's Stripe account
    const creatorAccountDoc = await adminDb.collection('connectedStripeAccounts').doc(creatorId).get()
    if (!creatorAccountDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Creator Stripe account not connected',
        details: { creatorId }
      })
    }

    const creatorAccount = creatorAccountDoc.data()
    console.log(`✅ [Debug] Creator account found:`, {
      stripe_user_id: creatorAccount?.stripe_user_id,
      charges_enabled: creatorAccount?.charges_enabled,
      payouts_enabled: creatorAccount?.payouts_enabled,
      details_submitted: creatorAccount?.details_submitted,
      transfers_capability: creatorAccount?.transfers_capability
    })

    // Validate all requirements
    const issues = []

    if (!bundleData?.stripeProductId) {
      issues.push('Bundle missing Stripe Product ID')
    }

    if (!bundleData?.stripePriceId) {
      issues.push('Bundle missing Stripe Price ID')
    }

    if (!creatorAccount?.charges_enabled) {
      issues.push('Creator account charges not enabled')
    }

    if (!creatorAccount?.payouts_enabled) {
      issues.push('Creator account payouts not enabled')
    }

    if (!creatorAccount?.details_submitted) {
      issues.push('Creator account details not submitted')
    }

    if (creatorAccount?.transfers_capability !== 'active' && !creatorAccount?.charges_enabled) {
      issues.push('Creator account transfers capability not active')
    }

    return NextResponse.json({
      success: issues.length === 0,
      bundle: {
        id: bundleId,
        title: bundleData?.title,
        price: bundleData?.price,
        stripeProductId: bundleData?.stripeProductId,
        stripePriceId: bundleData?.stripePriceId
      },
      creatorAccount: {
        stripe_user_id: creatorAccount?.stripe_user_id,
        charges_enabled: creatorAccount?.charges_enabled,
        payouts_enabled: creatorAccount?.payouts_enabled,
        details_submitted: creatorAccount?.details_submitted,
        transfers_capability: creatorAccount?.transfers_capability
      },
      issues: issues.length > 0 ? issues : undefined
    })

  } catch (error) {
    console.error('❌ [Debug] Checkout test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
