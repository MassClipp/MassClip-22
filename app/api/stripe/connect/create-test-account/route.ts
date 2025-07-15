import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

interface CreateAccountBody {
  email?: string
  country?: string
  type?: "standard" | "express" | "custom"
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid
    console.log(`🔧 [Create Test Account] Request from user: ${userId}`)

    const body = (await request.json()) as CreateAccountBody
    const { email, country = "US", type = "standard" } = body

    // Create a new connected account through Stripe
    const account = await stripe.accounts.create({
      type,
      country,
      email: email || decodedToken.email,
      metadata: {
        created_by_platform: "massclip",
        firebase_uid: userId,
        created_at: new Date().toISOString(),
        environment: "test",
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      individual: {
        email: email || decodedToken.email,
        first_name: "Test",
        last_name: "User",
        dob: {
          day: 1,
          month: 1,
          year: 1990,
        },
        address: {
          line1: "123 Test Street",
          city: "Test City",
          state: "CA",
          postal_code: "12345",
          country: "US",
        },
        phone: "+15555551234",
        ssn_last_4: "0000",
      },
      business_profile: {
        mcc: "5734", // Computer software stores
        name: "Test Creator Account",
        product_description: "Digital content creation",
        support_email: email || decodedToken.email,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${userId}`,
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
        user_agent: request.headers.get("user-agent") || "MassClip Platform",
      },
    })

    console.log(`✅ [Create Test Account] Created account: ${account.id}`)

    // Save the account to Firestore
    await db
      .collection("users")
      .doc(userId)
      .update({
        stripeTestAccountId: account.id,
        stripeTestConnected: true,
        stripeTestAccountCreatedAt: new Date().toISOString(),
        stripeTestAccountDetails: {
          type: account.type,
          country: account.country,
          email: account.email,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
        updatedAt: new Date().toISOString(),
      })

    console.log(`💾 [Create Test Account] Saved to Firestore for user: ${userId}`)

    return NextResponse.json({
      success: true,
      account_id: account.id,
      account_type: account.type,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      account_details: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        created: new Date(account.created * 1000).toISOString(),
        capabilities: account.capabilities,
        metadata: account.metadata,
      },
    })
  } catch (error: any) {
    console.error("❌ [Create Test Account] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        details: error.raw || error,
      },
      { status: 500 },
    )
  }
}
