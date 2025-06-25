import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase/firebaseAdmin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: "No Stripe account connected. Please connect your Stripe account first." },
        { status: 400 },
      )
    }

    try {
      // Create an account link for the user to complete their verification
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?verification=complete`,
        type: "account_onboarding",
      })

      console.log(`Created account link for ${stripeAccountId}`)

      // Update user document to track the verification attempt
      await db.collection("users").doc(uid).update({
        accountLinkCreated: true,
        accountLinkCreatedAt: new Date(),
        lastAccountLinkUrl: accountLink.url,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: "Account verification link created successfully",
        accountId: stripeAccountId,
        url: accountLink.url,
      })
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError)

      return NextResponse.json(
        {
          error: "Failed to create account link",
          details: stripeError.message || "Unknown Stripe error",
          code: stripeError.code,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error creating account link:", error)
    return NextResponse.json(
      {
        error: "Failed to create account link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
