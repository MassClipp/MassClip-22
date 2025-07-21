export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"

// Simple auth check that doesn't require Firebase Admin
async function getAuthFromHeaders(requestHeaders: Headers) {
  const authHeader = requestHeaders.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return { uid: "demo-user" }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Linking Stripe account...")

    // Simple auth check for demo
    const user = await getAuthFromHeaders(request.headers)

    if (!user) {
      console.log("❌ No authentication found")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required - please log in first",
        },
        { status: 401 },
      )
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔗 Linking account ${accountId} to user ${user.uid}`)

    // For demo purposes, simulate successful linking
    const accountInfo = {
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      accountType: "express",
      country: "US",
      lastUpdated: new Date(),
    }

    console.log(`✅ Successfully linked Stripe account ${accountId}`)

    return NextResponse.json({
      success: true,
      message: "Stripe account linked successfully",
      accountId,
      accountStatus: accountInfo,
    })
  } catch (error: any) {
    console.error("❌ Unexpected error linking account:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
