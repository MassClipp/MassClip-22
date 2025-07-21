import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🆕 [Onboard] Starting Stripe onboarding...")

    // First test the auth endpoint
    const testAuthResponse = await fetch(`${request.nextUrl.origin}/api/test-auth`, {
      headers: {
        authorization: request.headers.get("authorization") || "",
      },
    })

    console.log("🧪 [Onboard] Test auth response:", testAuthResponse.status)

    if (!testAuthResponse.ok) {
      const testError = await testAuthResponse.json()
      console.error("❌ [Onboard] Test auth failed:", testError)
      return NextResponse.json(
        {
          error: "Authentication test failed",
          details: testError,
        },
        { status: 401 },
      )
    }

    const testResult = await testAuthResponse.json()
    console.log("✅ [Onboard] Test auth passed:", testResult.user)

    const userId = testResult.user.uid
    const userEmail = testResult.user.email

    // Create Stripe Express account
    try {
      const account = await stripe.accounts.create({
        type: "express",
        email: userEmail,
        metadata: {
          userId: userId,
        },
      })

      console.log("✅ [Onboard] Stripe account created:", account.id)

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${request.nextUrl.origin}/dashboard/connect-stripe?refresh=true`,
        return_url: `${request.nextUrl.origin}/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      console.log("✅ [Onboard] Account link created:", accountLink.url)

      // Save account to user document
      await db
        .collection("users")
        .doc(userId)
        .update({
          stripeAccountId: account.id,
          stripeAccountStatus: "pending",
          stripeAccountDetails: {
            type: account.type,
            email: account.email,
            created: account.created,
          },
          updatedAt: new Date(),
        })

      console.log("✅ [Onboard] User document updated")

      return NextResponse.json({
        success: true,
        accountId: account.id,
        url: accountLink.url,
        message: "Onboarding link created successfully",
      })
    } catch (stripeError: any) {
      console.error("❌ [Onboard] Stripe error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create Stripe account",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Onboard] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
