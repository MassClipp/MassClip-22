import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Stripe Test] Starting product creation test")

    // Get session
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user data
    const userDoc = await db.collection("users").doc(session.uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    if (!userData.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 })
    }

    console.log("🧪 [Stripe Test] Testing with account:", userData.stripeAccountId)

    // Test 1: Check account status
    const account = await stripe.accounts.retrieve(userData.stripeAccountId)
    console.log("🧪 [Stripe Test] Account status:", {
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
    })

    // Test 2: Create a test product
    const testProduct = await stripe.products.create(
      {
        name: "Test Product Box",
        description: "This is a test product created by the API",
        metadata: {
          test: "true",
          creatorId: session.uid,
          platform: "massclip",
        },
      },
      {
        stripeAccount: userData.stripeAccountId,
      },
    )

    console.log("🧪 [Stripe Test] Test product created:", testProduct.id)

    // Test 3: Create a test price
    const testPrice = await stripe.prices.create(
      {
        product: testProduct.id,
        unit_amount: 999, // $9.99
        currency: "usd",
        metadata: {
          test: "true",
          creatorId: session.uid,
        },
      },
      {
        stripeAccount: userData.stripeAccountId,
      },
    )

    console.log("🧪 [Stripe Test] Test price created:", testPrice.id)

    // Test 4: Clean up test resources
    await stripe.products.update(testProduct.id, { active: false }, { stripeAccount: userData.stripeAccountId })
    console.log("🧪 [Stripe Test] Test product deactivated")

    return NextResponse.json({
      success: true,
      message: "Stripe integration test completed successfully",
      results: {
        accountStatus: {
          charges_enabled: account.charges_enabled,
          details_submitted: account.details_submitted,
          payouts_enabled: account.payouts_enabled,
        },
        testProduct: {
          id: testProduct.id,
          name: testProduct.name,
          created: new Date(testProduct.created * 1000).toISOString(),
        },
        testPrice: {
          id: testPrice.id,
          unit_amount: testPrice.unit_amount,
          currency: testPrice.currency,
        },
      },
    })
  } catch (error: any) {
    console.error("🧪 [Stripe Test] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        details: {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          requestId: error.requestId,
        },
      },
      { status: 500 },
    )
  }
}
