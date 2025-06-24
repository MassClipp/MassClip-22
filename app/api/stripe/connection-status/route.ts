import { type NextRequest, NextResponse } from "next/server"
import { db, verifyIdToken } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [Stripe Status] Starting connection check...`)

    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      console.error("❌ [Stripe Status] No ID token provided")
      return NextResponse.json(
        {
          success: false,
          error: "ID token is required",
          isConnected: false,
        },
        { status: 400 },
      )
    }

    // Verify the ID token using Firebase Admin
    let decodedToken
    try {
      decodedToken = await verifyIdToken(idToken)
      console.log(`✅ [Stripe Status] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Stripe Status] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication token",
          isConnected: false,
        },
        { status: 401 },
      )
    }

    // Get user document from Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get()

    if (!userDoc.exists) {
      console.log(`ℹ️ [Stripe Status] User profile not found for: ${decodedToken.uid}`)
      return NextResponse.json({
        success: true,
        isConnected: false,
        message: "User profile not found",
      })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log(`ℹ️ [Stripe Status] No Stripe account linked for user: ${decodedToken.uid}`)
      return NextResponse.json({
        success: true,
        isConnected: false,
        message: "No Stripe account linked",
      })
    }

    // Verify the Stripe account is still valid
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      const isConnected = account.charges_enabled && account.details_submitted
      const needsOnboarding =
        !account.details_submitted ||
        (account.requirements?.currently_due?.length || 0) > 0 ||
        (account.requirements?.past_due?.length || 0) > 0

      console.log(`✅ [Stripe Status] Account ${stripeAccountId} - Connected: ${isConnected}`)

      return NextResponse.json({
        success: true,
        isConnected,
        accountId: stripeAccountId,
        needsOnboarding,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirementsCount:
            (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Stripe Status] Stripe account verification failed:", stripeError)

      // If account doesn't exist, remove it from user profile
      if (stripeError.code === "resource_missing") {
        await db.collection("users").doc(decodedToken.uid).update({
          stripeAccountId: null,
          stripeAccountStatus: null,
        })
      }

      return NextResponse.json({
        success: true,
        isConnected: false,
        error: "Stripe account is invalid or inaccessible",
      })
    }
  } catch (error: any) {
    console.error("❌ [Stripe Status] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check Stripe connection",
        details: error.message,
        isConnected: false,
      },
      { status: 500 },
    )
  }
}
