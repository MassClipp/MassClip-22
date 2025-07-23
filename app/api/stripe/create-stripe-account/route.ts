import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/url-utils"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Stripe] Creating new Express Connect account...")

    // Create a new Stripe Express Connect account
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual", // Default to individual, can be updated during onboarding
    })

    console.log(`✅ [Stripe] Created account: ${account.id}`)

    // Get the base URL for return and refresh URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl()

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
      return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [Stripe] Generated onboarding link for account ${account.id}`)

    // Return the onboarding URL
    return NextResponse.json({
      url: accountLink.url,
      accountId: account.id,
    })
  } catch (error: any) {
    console.error("❌ [Stripe] Error creating account:", error)

    return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
  }
}
