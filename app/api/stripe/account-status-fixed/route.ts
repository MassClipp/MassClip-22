import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Account Status] Starting account status check...")

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request.headers)
    const userId = authUser.uid

    console.log(`🔍 [Account Status] Checking status for user: ${userId}`)

    // Get Stripe account from connectedStripeAccounts collection
    const accountDoc = await adminDb.collection("connectedStripeAccounts").doc(userId).get()

    if (!accountDoc.exists) {
      console.log(`❌ [Account Status] No connected Stripe account found for user: ${userId}`)
      return NextResponse.json({
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
      })
    }

    const accountData = accountDoc.data()!
    const stripeAccountId = accountData.stripeAccountId

    console.log(`🔍 [Account Status] Found account: ${stripeAccountId}`)

    // Fetch fresh account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId)

    console.log(`📊 [Account Status] Fresh Stripe account data:`, {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
    })

    // Update our stored data with fresh info
    await adminDb.collection("connectedStripeAccounts").doc(userId).update({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements?.currently_due || [],
      country: account.country,
      business_type: account.business_type,
      default_currency: account.default_currency,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Determine if actions are required
    const hasCurrentlyDue = (account.requirements?.currently_due?.length || 0) > 0
    const hasPastDue = (account.requirements?.past_due?.length || 0) > 0
    const hasPendingVerification = (account.requirements?.pending_verification?.length || 0) > 0

    const actionsRequired = hasCurrentlyDue || hasPastDue || hasPendingVerification
    const isFullyEnabled = account.charges_enabled && account.payouts_enabled && account.details_submitted

    // Create account link if actions are required
    let actionUrl = null
    if (actionsRequired) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/earnings?completed=true`,
          type: "account_onboarding",
        })
        actionUrl = accountLink.url
      } catch (linkError) {
        console.error("❌ [Account Status] Error creating account link:", linkError)
      }
    }

    // Format requirements with descriptions
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

    console.log(`✅ [Account Status] Response prepared for user: ${userId}`)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error("❌ [Account Status] Error:", error)
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
      { status: 500 }
    )
  }
}
