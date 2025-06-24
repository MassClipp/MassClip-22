import { type NextRequest, NextResponse } from "next/server"
import { db, verifyIdToken } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    console.log(`🔍 [Stripe Status] Checking connection status...`)

    // Verify authentication
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)

    const { creatorId } = await req.json()

    if (!creatorId) {
      return new NextResponse("Creator ID required", { status: 400 })
    }

    console.log(`🔍 [Stripe Status] Checking creator: ${creatorId}`)

    // Get creator data
    const creatorDoc = await db.collection("users").doc(creatorId).get()
    if (!creatorDoc.exists) {
      return new NextResponse("Creator not found", { status: 404 })
    }

    const creatorData = creatorDoc.data()
    if (!creatorData?.stripeAccountId) {
      return new NextResponse("Creator has not connected Stripe account", { status: 400 })
    }

    // Verify Stripe account is active
    try {
      const account = await stripe.accounts.retrieve(creatorData.stripeAccountId)

      const isActive = account.charges_enabled && account.payouts_enabled

      console.log(`✅ [Stripe Status] Account ${creatorData.stripeAccountId} - Active: ${isActive}`)

      if (!isActive) {
        return new NextResponse("Creator's payment account is not fully set up", { status: 400 })
      }

      return NextResponse.json({
        connected: true,
        accountId: creatorData.stripeAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      })
    } catch (stripeError) {
      console.error("❌ [Stripe Status] Stripe API error:", stripeError)
      return new NextResponse("Unable to verify payment system", { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Stripe Status] Error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
