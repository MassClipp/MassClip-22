export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"

// Simple auth check that doesn't require Firebase Admin
async function getAuthFromHeaders(requestHeaders: Headers) {
  const authHeader = requestHeaders.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return { uid: "demo-user" } // For demo purposes
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking Stripe connection status...")

    // Simple auth check for demo
    const user = await getAuthFromHeaders(request.headers)

    if (!user) {
      console.log("❌ No authentication found")
      return NextResponse.json({
        success: true,
        connected: false,
        message: "No authentication - please log in",
      })
    }

    console.log(`🔍 Checking connection status for user: ${user.uid}`)

    // For demo purposes, return not connected
    return NextResponse.json({
      success: true,
      connected: false,
      message: "No Stripe account connected",
    })
  } catch (error: any) {
    console.error("❌ Unexpected error checking connection status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        connected: false,
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
