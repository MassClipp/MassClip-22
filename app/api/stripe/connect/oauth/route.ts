import { type NextRequest, NextResponse } from "next/server"
import { generateStripeConnectUrl } from "@/lib/stripe-connect-service"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }
    
    console.log(`🔄 Generating Stripe Connect OAuth URL for user: ${userId}`)
    
    // Generate the OAuth URL
    const authUrl = generateStripeConnectUrl(userId)
    
    console.log(`✅ Generated OAuth URL successfully`)
    
    return NextResponse.json({
      authUrl,
      message: "OAuth URL generated successfully"
    })
    
  } catch (error) {
    console.error("❌ Error generating OAuth URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate OAuth URL" },
      { status: 500 }
    )
  }
}
