import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔧 Creating Stripe account for user: ${userId}`)

    // Check if user already has a Stripe account
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      console.log(`⚠️ User ${userId} already has Stripe account: ${userData.stripeAccountId}`)
      return NextResponse.json({ error: "User already has a Stripe account" }, { status: 400 })
    }

    // Create a new Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US", // Default to US, can be made dynamic later
      email: decodedToken.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    console.log(`✅ Created Stripe account: ${account.id}`)

    // Save the account ID to the user's profile
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: "pending",
      updatedAt: new Date(),
    })

    // Get the base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/earnings?refresh=true`,
      return_url: `${baseUrl}/dashboard/earnings?success=true`,
      type: "account_onboarding",
    })

    console.log(`🔗 Generated onboarding URL for account: ${account.id}`)

    return NextResponse.json({
      url: accountLink.url,
      accountId: account.id,
    })
  } catch (error: any) {
    console.error("❌ Failed to create Stripe account:", error)
    return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
  }
}
