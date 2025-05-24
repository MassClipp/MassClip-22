import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase/firebaseAdmin"
import Stripe from "stripe"

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie)
    const uid = decodedClaims.uid

    // Get the user's Stripe account ID from Firestore
    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        isOnboarded: false,
        canReceivePayments: false,
        accountId: null,
      })
    }

    // Retrieve the Stripe account
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    })

    const account = await stripe.accounts.retrieve(stripeAccountId)

    // Check if onboarding is complete
    const isOnboarded = account.details_submitted || false
    const canReceivePayments = account.charges_enabled || false

    return NextResponse.json({
      isOnboarded,
      canReceivePayments,
      accountId: stripeAccountId,
      requirements: account.requirements,
    })
  } catch (error) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json(
      { error: "Failed to check Stripe status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
