import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

interface CreateTestAccountBody {
  email: string
  country: string
  type: "express" | "standard"
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔧 [Create Test Account] Request from user: ${userId}`)

    const body = (await request.json()) as CreateTestAccountBody
    const { email, country = "US", type = "express" } = body

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔧 [Create Test Account] Creating ${type} account for: ${email}`)

    // Create Express account (easier to set up than Standard)
    const account = await stripe.accounts.create({
      type: type,
      country: country,
      email: email,
      metadata: {
        created_by_platform: "massclip",
        firebase_uid: userId,
        created_at: Math.floor(Date.now() / 1000).toString(), // Unix timestamp as string
        user_email: email,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    console.log(`✅ [Create Test Account] Created account: ${account.id}`)

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-real-status`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/debug-stripe-real-status`,
      type: "account_onboarding",
    })

    // Store the account ID in Firestore
    try {
      await db.collection("users").doc(userId).update({
        stripeTestAccountId: account.id,
        stripeTestConnected: true,
        stripeTestAccountCreated: new Date().toISOString(),
      })
      console.log(`💾 [Create Test Account] Stored account ID in Firestore`)
    } catch (firestoreError) {
      console.warn(`⚠️ [Create Test Account] Failed to store in Firestore:`, firestoreError)
      // Don't fail the request if Firestore update fails
    }

    return NextResponse.json({
      success: true,
      account_id: account.id,
      account_type: account.type,
      onboarding_url: accountLink.url,
      account_details: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        created: new Date(account.created * 1000).toISOString(),
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        metadata: account.metadata,
      },
      message: `${type} account created successfully! Complete onboarding to activate.`,
    })
  } catch (error: any) {
    console.error("❌ [Create Test Account] Error:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        {
          success: false,
          error: `Stripe Error: ${error.message}`,
          code: error.code,
          param: error.param,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
