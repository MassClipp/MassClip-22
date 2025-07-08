import { type NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Only allow in test mode
    if (!STRIPE_CONFIG.isTestMode) {
      return NextResponse.json(
        {
          success: false,
          error: "This endpoint only works in test mode",
        },
        { status: 400 },
      )
    }

    // Get the base URL for return URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US", // Default to US for testing
      email: `test-${Date.now()}@example.com`, // Generate a test email
    })

    console.log("Created test Stripe account:", account.id)

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/stripe-test-connect?refresh=true`,
      return_url: `${baseUrl}/stripe-test-connect?success=true&account=${account.id}`,
      type: "account_onboarding",
    })

    // Store the account ID temporarily (in a real app, save to database)
    // For this test, we'll log it and expect manual environment variable setup
    console.log("🔗 Test Stripe Account Created:", {
      accountId: account.id,
      onboardingUrl: accountLink.url,
      note: "Add STRIPE_TEST_CONNECTED_ACCOUNT_ID=" + account.id + " to your environment variables",
    })

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
    })
  } catch (error) {
    console.error("Failed to create connection link:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create connection link",
      },
      { status: 500 },
    )
  }
}
