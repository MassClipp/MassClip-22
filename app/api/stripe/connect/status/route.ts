import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase/firebaseAdmin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Get the user's Stripe account ID from Firestore
    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        isOnboarded: false,
        canReceivePayments: false,
        accountId: null,
        isConnected: false,
        detailedStatus: "no_account",
        message: "No Stripe account connected. Please connect your Stripe account first.",
        capabilities: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        },
        requirementsSummary: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
        },
      })
    }

    // Retrieve the Stripe account with detailed information
    const account = await stripe.accounts.retrieve(stripeAccountId)

    // Detailed status analysis
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false
    const detailsSubmitted = account.details_submitted || false
    const isOnboarded = detailsSubmitted && chargesEnabled
    const canReceivePayments = chargesEnabled && payoutsEnabled

    // Analyze requirements
    const currentlyDue = account.requirements?.currently_due || []
    const eventuallyDue = account.requirements?.eventually_due || []
    const pastDue = account.requirements?.past_due || []
    const pendingVerification = account.requirements?.pending_verification || []

    // Determine detailed status and message
    let detailedStatus = "unknown"
    let message = "Account status unclear"

    if (!detailsSubmitted) {
      detailedStatus = "onboarding_incomplete"
      message = "Stripe onboarding process not completed. Please complete the setup process."
    } else if (pastDue.length > 0) {
      detailedStatus = "past_due_requirements"
      message = `Urgent: ${pastDue.length} requirement(s) are past due and must be resolved immediately.`
    } else if (currentlyDue.length > 0) {
      detailedStatus = "current_requirements"
      message = `${currentlyDue.length} requirement(s) need to be completed to enable payments.`
    } else if (pendingVerification.length > 0) {
      detailedStatus = "pending_verification"
      message = `${pendingVerification.length} item(s) are pending verification by Stripe.`
    } else if (!chargesEnabled) {
      detailedStatus = "charges_disabled"
      message = "Charges are disabled on this account. Contact Stripe support."
    } else if (!payoutsEnabled) {
      detailedStatus = "payouts_disabled"
      message = "Payouts are disabled. You can accept payments but cannot receive payouts yet."
    } else if (eventuallyDue.length > 0) {
      detailedStatus = "eventually_due_only"
      message = `Account is active and accepting payments. ${eventuallyDue.length} requirement(s) will be needed for higher volume processing.`
    } else if (canReceivePayments) {
      detailedStatus = "fully_enabled"
      message = "Account is fully set up and can receive payments."
    }

    // Update user document with latest status
    await db
      .collection("users")
      .doc(uid)
      .update({
        stripeAccountId: stripeAccountId,
        chargesEnabled,
        payoutsEnabled,
        stripeOnboardingComplete: isOnboarded,
        stripeCanReceivePayments: canReceivePayments,
        stripeStatusLastChecked: new Date(),
        stripeRequirements: {
          currently_due: currentlyDue,
          eventually_due: eventuallyDue,
          past_due: pastDue,
          pending_verification: pendingVerification,
        },
        stripeDetailedStatus: detailedStatus,
        isConnected: true,
      })

    return NextResponse.json({
      isOnboarded,
      canReceivePayments,
      accountId: stripeAccountId,
      isConnected: true,
      requirements: account.requirements,
      detailedStatus,
      message,
      capabilities: {
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
      },
      requirementsSummary: {
        currently_due: currentlyDue,
        eventually_due: eventuallyDue,
        past_due: pastDue,
        pending_verification: pendingVerification,
      },
    })
  } catch (error) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json(
      {
        error: "Failed to check Stripe status",
        details: error instanceof Error ? error.message : "Unknown error",
        detailedStatus: "error",
        message: "Unable to check account status. Please try again later.",
        isConnected: false,
      },
      { status: 500 },
    )
  }
}
