import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user already has a Stripe account
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      return NextResponse.json({
        accountId: userData.stripeAccountId,
        message: "Account already exists",
      })
    }

    // Create new Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        product_description: "Digital content and services",
      },
    })

    // Save account ID to Firestore
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: "pending",
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      updatedAt: new Date(),
    })

    console.log("Created Stripe account:", account.id, "for user:", userId)

    return NextResponse.json({
      accountId: account.id,
      message: "Account created successfully",
    })
  } catch (error) {
    console.error("Error creating Stripe account:", error)
    return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
  }
}
