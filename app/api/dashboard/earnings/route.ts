import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/firebase-server"
import { StripeEarningsService } from "@/lib/stripe-earnings-service"
import { validateEarningsData } from "@/lib/format-utils"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Starting earnings API request...")

    // Get authenticated session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ No authenticated session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("✅ Authenticated user:", userId)

    // Get user profile from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      console.log("❌ User profile not found in Firestore")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      console.log("⚠️ No Stripe account connected for user")
      return NextResponse.json(
        {
          error: "No Stripe account connected",
          message: "Please connect your Stripe account to view earnings",
          needsStripeConnection: true,
          data: validateEarningsData(null),
        },
        { status: 200 },
      )
    }

    console.log("💳 Found Stripe account:", stripeAccountId)

    // Fetch real earnings data from Stripe
    const stripeEarningsService = new StripeEarningsService()
    const earningsData = await stripeEarningsService.getEarningsData(stripeAccountId)

    console.log("📊 Raw Stripe earnings data:", earningsData)

    // Validate and format the data
    const validatedData = validateEarningsData(earningsData)
    console.log("✅ Validated earnings data:", validatedData)

    return NextResponse.json({
      success: true,
      data: validatedData,
      dataSource: "stripe",
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 Earnings API error:", error)

    // Return safe fallback data on error
    return NextResponse.json(
      {
        error: "Failed to fetch earnings data",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        data: validateEarningsData(null),
        dataSource: "fallback",
      },
      { status: 200 },
    )
  }
}
