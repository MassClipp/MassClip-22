import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user data from Firebase
    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()

    // Check if user already has a Stripe account
    if (userData?.stripeAccountId) {
      return NextResponse.json(
        {
          error: "User already has a Stripe account",
          accountId: userData.stripeAccountId,
        },
        { status: 400 },
      )
    }

    // Create a new Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userData?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        url: userData?.website || "https://massclip.pro",
      },
    })

    // Save the Stripe account ID to the user's record
    await adminDb.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      updatedAt: new Date(),
    })

    console.log(`✅ Created Stripe account ${account.id} for user ${userId}`)

    return NextResponse.json({
      success: true,
      accountId: account.id,
    })
  } catch (error) {
    console.error("Error creating Stripe account:", error)
    return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
  }
}
