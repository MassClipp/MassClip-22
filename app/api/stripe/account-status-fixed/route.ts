import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Account Status Fixed] Starting account status check...")

    // Try to get authenticated user from Firebase token
    let userId: string
    try {
      const authUser = await getAuthenticatedUser(request.headers)
      userId = authUser.uid
      console.log(`🔍 [Account Status Fixed] Authenticated via Firebase: ${userId}`)
    } catch (authError) {
      // Fall back to query parameter for debugging
      const searchParams = request.nextUrl.searchParams
      const debugUserId = searchParams.get("userId")

      if (debugUserId) {
        userId = debugUserId
        console.log(`🔍 [Account Status Fixed] Using debug userId: ${userId}`)
      } else {
        console.error("❌ [Account Status Fixed] No authentication found")
        return NextResponse.json(
          {
            error: "Unauthorized - no Firebase token or debug userId",
            connected: false,
            actionsRequired: false,
          },
          { status: 401 },
        )
      }
    }

    console.log(`🔍 [Account Status Fixed] Checking status for user: ${userId}`)

    // Get user's Stripe account ID from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error("❌ [Account Status Fixed] User document not found")
      return NextResponse.json(
        {
          error: "User not found",
          connected: false,
          actionsRequired: false,
        },
        { status: 404 },
      )
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    console.log(`🔍 [Account Status Fixed] User data found. StripeAccountId: ${stripeAccountId}`)

    if (!stripeAccountId) {
      console.error("❌ [Account Status Fixed] No Stripe account ID found for user")
      return NextResponse.json(
        {
          connected: false,
          error: "No Stripe account connected",
          actionsRequired: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: {
            currently_due: [],
            past_due: [],
            eventually_due: [],
            pending_verification: [],
          },
        },
        { status: 200 },
      )
    }

    console.log(`🔍 [Account Status Fixed] Fetching account details from Stripe for: ${stripeAccountId}`)

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId)

    console.log(`📊 [Account Status Fixed] Raw Stripe account data:`, {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      business_type: account.business_type,
      country: account.country,
      requirements: account.requirements,
    })

    // Determine if actions are required
    const hasCurrentlyDue = (account.requirements?.currently_due?.length || 0) > 0
    const hasPastDue = (account.requirements?.past_due?.length || 0) > 0
    const hasPendingVerification = (account.requirements?.pending_verification?.length || 0) > 0

    const actionsRequired = hasCurrentlyDue || hasPastDue || hasPendingVerification
    const isFullyEnabled = account.charges_enabled && account.payouts_enabled && account.details_submitted

    console.log(`📊 [Account Status Fixed] Computed status:`, {
      isFullyEnabled,
      actionsRequired,
      hasCurrentlyDue,
      hasPastDue,
      hasPendingVerification,
    })

    // Create account link if actions are required
    let actionUrl = null
    if (actionsRequired) {
      try {
        console.log(`🔗 [Account Status Fixed] Creating account link for required actions`)
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe/callback?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe/callback?completed=true`,
          type: "account_onboarding",
        })
        actionUrl = accountLink.url
        console.log(`✅ [Account Status Fixed] Account link created successfully`)
      } catch (linkError) {
        console.error("❌ [Account Status Fixed] Error creating account link:", linkError)
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

    console.log(`✅ [Account Status Fixed] Final response:`, {
      connected: response.connected,
      isFullyEnabled: response.isFullyEnabled,
      actionsRequired: response.actionsRequired,
      hasActionUrl: !!response.actionUrl,
      charges_enabled: response.charges_enabled,
      payouts_enabled: response.payouts_enabled,
      requirementCounts: {
        currently_due: response.requirements.currently_due.length,
        past_due: response.requirements.past_due.length,
        eventually_due: response.requirements.eventually_due.length,
        pending_verification: response.requirements.pending_verification.length,
      },
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ [Account Status Fixed] Error checking account status:", error)
    console.error("❌ [Account Status Fixed] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Failed to check account status",
        details: error.message,
        connected: false,
        actionsRequired: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements: {
          currently_due: [],
          past_due: [],
          eventually_due: [],
          pending_verification: [],
        },
      },
      { status: 500 },
    )
  }
}
