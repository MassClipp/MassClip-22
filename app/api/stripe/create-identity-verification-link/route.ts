import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    const body = await request.json()
    const { accountId } = body

    // Get user's Stripe account ID from Firestore if not provided
    let stripeAccountId = accountId
    if (!stripeAccountId) {
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 })
      }

      const userData = userDoc.data()
      stripeAccountId = userData?.stripeAccountId

      if (!stripeAccountId) {
        return NextResponse.json(
          { error: "No Stripe account connected. Please connect your Stripe account first." },
          { status: 400 },
        )
      }
    }

    try {
      // Get account details
      const account = await stripe.accounts.retrieve(stripeAccountId)

      // Create an account link for identity verification
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?setup=complete`,
        type: "account_onboarding",
        collect: "eventually_due", // This will collect all required information including SSN
      })

      console.log(`Created account link for ${stripeAccountId}: ${accountLink.url}`)

      // Update user document to track the verification attempt
      await db.collection("users").doc(user.uid).update({
        identityVerificationLinkCreated: true,
        identityVerificationLinkCreatedAt: new Date(),
        lastAccountLinkUrl: accountLink.url,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: "Identity verification link created successfully",
        accountId: stripeAccountId,
        accountType: account.type,
        businessType: account.business_type,
        verificationUrl: accountLink.url,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      })
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError)

      return NextResponse.json(
        {
          error: "Failed to create verification link",
          details: stripeError.message || "Unknown Stripe error",
          code: stripeError.code,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error creating identity verification link:", error)
    return NextResponse.json(
      {
        error: "Failed to create verification link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
