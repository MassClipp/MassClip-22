import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log("🔗 Creating Stripe Express account for user:", userId)

    // Get user document from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    let stripeAccountId = userData?.stripeAccountId

    // Create Stripe Express account if it doesn't exist
    if (!stripeAccountId) {
      console.log("📝 Creating new Stripe Express account...")
      
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userData?.email || decodedToken.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      stripeAccountId = account.id
      console.log("✅ Created Stripe account:", stripeAccountId)

      // Save the Stripe account ID to Firestore
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: "pending",
        stripeConnected: false,
        stripeConnectedAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create Express account link for onboarding
    console.log("🔗 Creating Express account link...")
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings?connected=true`,
      type: "account_onboarding",
    })

    console.log("✅ Account link created successfully")

    return NextResponse.json({
      success: true,
      connectUrl: accountLink.url,
      accountId: stripeAccountId,
    })

  } catch (error) {
    console.error("❌ Stripe onboard error:", error)
    return NextResponse.json(
      { 
        error: "Failed to create onboarding link",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
