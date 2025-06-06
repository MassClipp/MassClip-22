import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productBoxId = searchParams.get("productBoxId")

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    console.log(`🔍 [Checkout Debug] Checking product box: ${productBoxId}`)

    // Get the product box
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`📦 [Checkout Debug] Product box data:`, {
      id: productBoxId,
      title: productBoxData.title,
      price: productBoxData.price,
      currency: productBoxData.currency,
      type: productBoxData.type,
      stripePriceId: productBoxData.stripePriceId,
      stripeProductId: productBoxData.stripeProductId,
      stripeAccountId: productBoxData.stripeAccountId,
      active: productBoxData.active,
    })

    // Get creator data
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.data()

    if (!creatorData) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    console.log(`👤 [Checkout Debug] Creator data:`, {
      uid: productBoxData.creatorId,
      username: creatorData.username,
      stripeAccountId: creatorData.stripeAccountId,
      stripeOnboarded: creatorData.stripeOnboarded,
      chargesEnabled: creatorData.chargesEnabled,
      payoutsEnabled: creatorData.payoutsEnabled,
    })

    // Check Stripe account status
    let stripeAccountStatus = null
    if (creatorData.stripeAccountId && creatorData.stripeAccountId !== "test_account") {
      try {
        const account = await stripe.accounts.retrieve(creatorData.stripeAccountId)
        stripeAccountStatus = {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || [],
        }
        console.log(`🏦 [Checkout Debug] Stripe account status:`, stripeAccountStatus)
      } catch (stripeError) {
        console.error(`❌ [Checkout Debug] Stripe account error:`, stripeError)
        stripeAccountStatus = { error: stripeError.message }
      }
    }

    // Check if Stripe price exists
    let stripePriceStatus = null
    if (productBoxData.stripePriceId && creatorData.stripeAccountId !== "test_account") {
      try {
        const price = await stripe.prices.retrieve(productBoxData.stripePriceId, {
          stripeAccount: creatorData.stripeAccountId,
        })
        stripePriceStatus = {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          type: price.type,
          product: price.product,
        }
        console.log(`💰 [Checkout Debug] Stripe price status:`, stripePriceStatus)
      } catch (priceError) {
        console.error(`❌ [Checkout Debug] Stripe price error:`, priceError)
        stripePriceStatus = { error: priceError.message }
      }
    }

    return NextResponse.json({
      success: true,
      productBox: {
        id: productBoxId,
        title: productBoxData.title,
        price: productBoxData.price,
        currency: productBoxData.currency,
        type: productBoxData.type,
        stripePriceId: productBoxData.stripePriceId,
        stripeProductId: productBoxData.stripeProductId,
        stripeAccountId: productBoxData.stripeAccountId,
        active: productBoxData.active,
      },
      creator: {
        uid: productBoxData.creatorId,
        username: creatorData.username,
        stripeAccountId: creatorData.stripeAccountId,
        stripeOnboarded: creatorData.stripeOnboarded,
        chargesEnabled: creatorData.chargesEnabled,
        payoutsEnabled: creatorData.payoutsEnabled,
      },
      stripeAccount: stripeAccountStatus,
      stripePrice: stripePriceStatus,
      diagnostics: {
        hasStripeAccount: !!creatorData.stripeAccountId,
        hasStripePriceId: !!productBoxData.stripePriceId,
        isTestAccount: creatorData.stripeAccountId === "test_account",
        canCreateCheckout: !!(
          creatorData.stripeAccountId &&
          productBoxData.stripePriceId &&
          creatorData.stripeAccountId !== "test_account"
        ),
      },
    })
  } catch (error) {
    console.error("❌ [Checkout Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Debug check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
