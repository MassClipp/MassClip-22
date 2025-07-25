import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminDb } from "@/lib/firebase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type = "account_onboarding" } = await request.json()

    console.log(`🔗 [Account Link] Creating account link for user: ${session.user.id}, type: ${type}`)

    // Get user's Stripe account ID from Firestore
    const userDoc = await adminDb.collection("users").doc(session.user.id).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          error: "No Stripe account connected",
        },
        { status: 400 },
      )
    }

    const baseUrl = new URL(request.url).origin

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard/connect-stripe/callback?refresh=true`,
      return_url: `${baseUrl}/dashboard/connect-stripe/callback?completed=true`,
      type: type as any, // 'account_onboarding' or 'account_update'
    })

    console.log(`✅ [Account Link] Created account link:`, {
      accountId: stripeAccountId,
      url: accountLink.url,
      expires_at: accountLink.expires_at,
    })

    return NextResponse.json({
      url: accountLink.url,
      expires_at: accountLink.expires_at,
    })
  } catch (error: any) {
    console.error("❌ [Account Link] Error creating account link:", error)

    return NextResponse.json(
      {
        error: "Failed to create account link",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
