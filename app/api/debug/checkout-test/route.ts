import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { bundleId } = await request.json()

    if (!bundleId) {
      return NextResponse.json(
        { error: "Bundle ID is required" },
        { status: 400 }
      )
    }

    console.log("🔍 [Debug] Testing bundle prerequisites for:", bundleId)

    // Get bundle data
    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()
    
    if (!bundleDoc.exists) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    const bundleData = bundleDoc.data()
    const issues: string[] = []

    // Check bundle configuration
    if (!bundleData?.creatorId) {
      issues.push("Missing creator ID")
    }

    if (!bundleData?.price || bundleData.price <= 0) {
      issues.push("Invalid price")
    }

    if (!bundleData?.title) {
      issues.push("Missing title")
    }

    // Check creator's Stripe account
    if (bundleData?.creatorId) {
      console.log("🔍 [Debug] Checking creator Stripe account:", bundleData.creatorId)
      
      try {
        const userDoc = await adminDb.collection("users").doc(bundleData.creatorId).get()
        const userData = userDoc.data()

        if (!userData?.stripeAccountId) {
          issues.push("Creator has no Stripe account connected")
        } else {
          // Check connected Stripe account
          const connectedAccountDoc = await adminDb
            .collection("connectedStripeAccounts")
            .doc(bundleData.creatorId)
            .get()

          if (connectedAccountDoc.exists) {
            const accountData = connectedAccountDoc.data()
            
            if (!accountData?.charges_enabled) {
              issues.push("Creator's Stripe account cannot accept charges")
            }
            
            if (!accountData?.details_submitted) {
              issues.push("Creator's Stripe account setup is incomplete")
            }
            
            if (!accountData?.payouts_enabled) {
              issues.push("Creator's Stripe account cannot receive payouts")
            }
          } else {
            issues.push("Creator's Stripe account data not found")
          }
        }
      } catch (error) {
        console.error("❌ [Debug] Error checking creator account:", error)
        issues.push("Error checking creator's payment setup")
      }
    }

    // Check bundle content
    if (bundleData?.contentIds && bundleData.contentIds.length === 0) {
      issues.push("Bundle has no content")
    }

    const success = issues.length === 0

    console.log(`${success ? '✅' : '❌'} [Debug] Bundle prerequisites check:`, {
      bundleId,
      success,
      issues,
      bundleData: {
        title: bundleData?.title,
        price: bundleData?.price,
        creatorId: bundleData?.creatorId,
        contentCount: bundleData?.contentIds?.length || 0,
      }
    })

    return NextResponse.json({
      success,
      issues,
      bundle: {
        id: bundleId,
        title: bundleData?.title,
        price: bundleData?.price,
        creatorId: bundleData?.creatorId,
        contentCount: bundleData?.contentIds?.length || 0,
      }
    })

  } catch (error) {
    console.error("❌ [Debug] Checkout test error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
