import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [Account Status] Checking status for user: ${session.user.id}`)

    // Get user's Stripe account ID from Firestore
    const userDoc = await adminDb.collection("users").doc(session.user.id).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          connected: false,
          error: "No Stripe account connected",
        },
        { status: 200 },
      )
    }

    console.log(`🔍 [Account Status] Fetching account details for: ${stripeAccountId}`)

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId)

    console.log(`📊 [Account Status] Account details:`, {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: {
        currently_due: account.requirements?.currently_due?.length || 0,
        eventually_due: account.requirements?.eventually_due?.length || 0,
        past_due: account.requirements?.past_due?.length || 0,
        pending_verification: account.requirements?.pending_verification?.length || 0,
      },
    })

    // Determine if actions are required
    const hasCurrentlyDue = (account.requirements?.currently_due?.length || 0) > 0
    const hasPastDue = (account.requirements?.past_due?.length || 0) > 0
    const hasEventuallyDue = (account.requirements?.eventually_due?.length || 0) > 0
    const hasPendingVerification = (account.requirements?.pending_verification?.length || 0) > 0

    const actionsRequired = hasCurrentlyDue || hasPastDue || hasPendingVerification
    const isFullyEnabled = account.charges_enabled && account.payouts_enabled && account.details_submitted

    // Create account link if actions are required
    let actionUrl = null
    if (actionsRequired) {
      try {
        console.log(`🔗 [Account Status] Creating account link for required actions`)
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe/callback?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe/callback?completed=true`,
          type: "account_onboarding",
        })
        actionUrl = accountLink.url
        console.log(`✅ [Account Status] Account link created: ${actionUrl}`)
      } catch (linkError) {
        console.error("❌ [Account Status] Error creating account link:", linkError)
      }
    }

    // Get human-readable requirement descriptions
    const getRequirementDescription = (requirement: string) => {
      const descriptions: Record<string, string> = {
        "individual.ssn_last_4": "Social Security Number (last 4 digits)",
        "individual.id_number": "Social Security Number",
        "individual.verification.document": "Identity verification document",
        "individual.verification.additional_document": "Additional identity document",
        "business_profile.url": "Business website URL",
        "business_profile.mcc": "Business category",
        "tos_acceptance.date": "Terms of service acceptance",
        "tos_acceptance.ip": "Terms of service IP address",
        external_account: "Bank account information",
        "individual.address.line1": "Address information",
        "individual.address.city": "City information",
        "individual.address.state": "State information",
        "individual.address.postal_code": "Postal code",
        "individual.dob.day": "Date of birth",
        "individual.dob.month": "Date of birth",
        "individual.dob.year": "Date of birth",
        "individual.first_name": "First name",
        "individual.last_name": "Last name",
        "individual.phone": "Phone number",
        "individual.email": "Email address",
      }
      return descriptions[requirement] || requirement.replace(/_/g, " ").replace(/\./g, " ")
    }

    const formatRequirements = (requirements: string[]) => {
      return requirements.map((req) => ({
        field: req,
        description: getRequirementDescription(req),
      }))
    }

    const response = {
      connected: true,
      accountId: stripeAccountId,
      isFullyEnabled,
      actionsRequired,
      actionUrl,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: {
        currently_due: formatRequirements(account.requirements?.currently_due || []),
        past_due: formatRequirements(account.requirements?.past_due || []),
        eventually_due: formatRequirements(account.requirements?.eventually_due || []),
        pending_verification: formatRequirements(account.requirements?.pending_verification || []),
      },
      disabled_reason: account.requirements?.disabled_reason,
      country: account.country,
      business_type: account.business_type,
    }

    console.log(`✅ [Account Status] Status check complete:`, {
      isFullyEnabled,
      actionsRequired,
      hasActionUrl: !!actionUrl,
      requirementCounts: {
        currently_due: response.requirements.currently_due.length,
        past_due: response.requirements.past_due.length,
        eventually_due: response.requirements.eventually_due.length,
        pending_verification: response.requirements.pending_verification.length,
      },
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Account Status] Error checking account status:", error)

    return NextResponse.json(
      {
        error: "Failed to check account status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
