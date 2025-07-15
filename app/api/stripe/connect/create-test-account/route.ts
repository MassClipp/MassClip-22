import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

interface CreateAccountBody {
  email?: string
  country?: string
  type?: "express" | "custom"
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔧 [Create Test Account] Request from user: ${userId}`)

    const body = (await request.json()) as CreateAccountBody
    const { email, country = "US", type = "express" } = body

    // Create a new Express connected account (allows platform to handle onboarding)
    const account = await stripe.accounts.create({
      type, // Use Express instead of Standard
      country,
      email: email || decodedToken.email,
      metadata: {
        created_by_platform: "massclip",
        firebase_uid: userId,
        created_at: new Date().toISOString(),
        environment: "test",
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // For Express accounts, we don't pre-fill personal information
      // The user will complete this during onboarding
      business_profile: {
        mcc: "5734", // Computer software stores
        product_description: "Digital content creation",
        support_email: email || decodedToken.email,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${userId}`,
      },
    })

    console.log(`✅ [Create Test Account] Created Express account: ${account.id}`)

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-real-status?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-real-status?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 [Create Test Account] Created onboarding link: ${accountLink.url}`)

    // Save the account to Firestore
    await db
      .collection("users")
      .doc(userId)
      .update({
        stripeTestAccountId: account.id,
        stripeTestConnected: true,
        stripeTestAccountCreatedAt: new Date().toISOString(),
        stripeTestOnboardingUrl: accountLink.url,
        stripeTestAccountDetails: {
          type: account.type,
          country: account.country,
          email: account.email,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
        updatedAt: new Date().toISOString(),
      })

    console.log(`💾 [Create Test Account] Saved to Firestore for user: ${userId}`)

    return NextResponse.json({
      success: true,
      account_id: account.id,
      account_type: account.type,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      onboarding_url: accountLink.url,
      account_details: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        created: new Date(account.created * 1000).toISOString(),
        capabilities: account.capabilities,
        metadata: account.metadata,
      },
      next_steps: [
        "Account created successfully",
        "Complete onboarding using the provided URL",
        "Account will be fully functional after onboarding",
      ],
    })
  } catch (error: any) {
    console.error("❌ [Create Test Account] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        details: error.raw || error,
        solution:
          error.code === "account_invalid"
            ? "Try using Express account type instead of Standard"
            : "Check Stripe dashboard for more details",
      },
      { status: 500 },
    )
  }
}
