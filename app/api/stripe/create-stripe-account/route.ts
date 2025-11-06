import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }
    
    console.log(`🔄 Creating Stripe Express account for user: ${userId}`)
    
    // Create Express account
    const account = await stripe.accounts.create({
      type: "express",
      metadata: {
        userId: userId,
        platform: "massclip",
      },
    })
    
    console.log(`✅ Created Stripe account: ${account.id}`)
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe/callback?success=true&account_id=${account.id}`,
      type: "account_onboarding",
    })
    
    console.log(`✅ Created account onboarding link`)
    
    return NextResponse.json({
      accountId: account.id,
      url: accountLink.url,
      message: "Stripe account created successfully"
    })
    
  } catch (error) {
    console.error("❌ Error creating Stripe account:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Stripe account" },
      { status: 500 }
    )
  }
}
