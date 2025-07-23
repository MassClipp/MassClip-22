import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get("state") // This should be the userId
    const code = searchParams.get("code")

    console.log("OAuth callback received:", { state, code: !!code })

    if (!state) {
      console.error("No state parameter provided")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=no_state`)
    }

    const userId = state

    // Get user's Stripe account ID
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      console.error("No Stripe account ID found for user:", userId)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=no_account`)
    }

    const accountId = userData.stripeAccountId

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    console.log("Account details:", {
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    })

    // Update user's Stripe status in Firestore
    const updateData: any = {
      stripeAccountStatus: account.details_submitted ? "active" : "pending",
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      updatedAt: new Date(),
    }

    await adminDb.collection("users").doc(userId).update(updateData)

    console.log("Updated user data:", updateData)

    // Redirect to success page
    const redirectUrl = account.details_submitted
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?success=true`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?pending=true`

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("Error in OAuth callback:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?error=callback_failed`)
  }
}
