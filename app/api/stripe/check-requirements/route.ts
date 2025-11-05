import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(request: NextRequest) {
  try {
    // Get the Firebase ID token from the Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user's Stripe account ID from query params
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    if (!accountId) {
      return NextResponse.json({ error: "Stripe account ID required" }, { status: 400 })
    }

    // Retrieve the Stripe account
    const account = await stripe.accounts.retrieve(accountId)

    // Check specifically for SSN/ITIN requirements
    const ssnRequirements = [
      "individual.ssn_last_4",
      "individual.id_number", // This covers ITIN
      "individual.verification.document",
    ]

    const allRequirements = [
      ...(account.requirements?.eventually_due || []),
      ...(account.requirements?.currently_due || []),
      ...(account.requirements?.past_due || []),
    ]

    const needsSSN = allRequirements.some((req) => ssnRequirements.includes(req))
    const hasPastDue = account.requirements?.past_due?.some((req) => ssnRequirements.includes(req))
    const hasCurrentDue = account.requirements?.currently_due?.some((req) => ssnRequirements.includes(req))

    // Determine urgency level
    let urgencyLevel = "low"
    if (hasPastDue) urgencyLevel = "high"
    else if (hasCurrentDue) urgencyLevel = "medium"

    return NextResponse.json({
      success: true,
      accountId: account.id,
      needsSSN,
      urgencyLevel,
      requirements: {
        eventually_due: account.requirements?.eventually_due || [],
        currently_due: account.requirements?.currently_due || [],
        past_due: account.requirements?.past_due || [],
        pending_verification: account.requirements?.pending_verification || [],
      },
      capabilities: {
        charges: account.capabilities?.card_payments,
        transfers: account.capabilities?.transfers,
      },
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    })
  } catch (error) {
    console.error("Error checking Stripe requirements:", error)
    return NextResponse.json(
      {
        error: "Failed to check account requirements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
