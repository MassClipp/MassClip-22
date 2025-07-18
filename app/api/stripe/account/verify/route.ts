import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { cookies } from "next/headers"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

async function getSessionCookie(request: NextRequest): Promise<string | null> {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("session")
  return sessionCookie ? sessionCookie.value : null
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = await getSessionCookie(request)

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the session cookie. In this case an additional check is performed.
    const decodedToken = await auth.verifySessionCookie(sessionCookie)

    // Get user's Stripe account info
    const userDoc = await db.collection("users").doc(decodedToken.uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    if (!userData.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        canAcceptPayments: false,
        status: "no_account",
        message: "No Stripe account connected",
        requirements: [],
        suggestedActions: ["Connect your Stripe account", "Complete the onboarding process"],
      })
    }

    // Get detailed account information from Stripe
    const account = await stripe.accounts.retrieve(userData.stripeAccountId)

    const status = {
      connected: true,
      accountId: userData.stripeAccountId,
      canAcceptPayments: account.charges_enabled && account.details_submitted,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      currency: account.default_currency,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
      capabilities: account.capabilities,
      businessType: account.business_type,
      created: account.created,
    }

    // Determine status and provide guidance
    let statusCode = "active"
    let message = "Account is active and can accept payments"
    let suggestedActions: string[] = []

    if (!account.details_submitted) {
      statusCode = "onboarding_incomplete"
      message = "Account onboarding is incomplete"
      suggestedActions = ["Complete your Stripe onboarding", "Submit all required business information"]
    } else if (!account.charges_enabled) {
      statusCode = "charges_disabled"
      message = "Account cannot accept payments"
      suggestedActions = [
        "Check your Stripe dashboard for issues",
        "Complete any pending requirements",
        "Contact Stripe support if needed",
      ]
    } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
      statusCode = "requirements_due"
      message = `Account has ${account.requirements.currently_due.length} pending requirements`
      suggestedActions = [
        "Visit your Stripe dashboard",
        "Complete pending requirements",
        `Outstanding: ${account.requirements.currently_due.join(", ")}`,
      ]
    } else if (account.requirements?.past_due && account.requirements.past_due.length > 0) {
      statusCode = "past_due_requirements"
      message = "Account has overdue requirements"
      suggestedActions = [
        "Immediately complete overdue requirements",
        "Visit your Stripe dashboard",
        `Overdue: ${account.requirements.past_due.join(", ")}`,
      ]
    }

    return NextResponse.json({
      ...status,
      status: statusCode,
      message,
      suggestedActions,
      userId: decodedToken.uid,
      email: decodedToken.email,
    })
  } catch (error) {
    console.error("❌ [Stripe Account Verify] Error:", error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe API error",
          details: error.message,
          type: error.type,
          suggestedActions: [
            "Check your Stripe account status",
            "Try again in a few moments",
            "Contact support if the issue persists",
          ],
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to verify Stripe account",
        details: error instanceof Error ? error.message : "Unknown error",
        suggestedActions: [
          "Check your internet connection",
          "Try again later",
          "Contact support if the issue continues",
        ],
      },
      { status: 500 },
    )
  }
}
