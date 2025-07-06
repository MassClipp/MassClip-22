import { type NextRequest, NextResponse } from "next/server"
import { validateStripeSession } from "@/lib/stripe-client"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 },
      )
    }

    console.log("🔍 [Session Debug] Debugging session:", sessionId.substring(0, 20) + "...")

    const result = await validateStripeSession(sessionId)

    if (result.success) {
      console.log("✅ [Session Debug] Session found and validated")
      return NextResponse.json({
        success: true,
        session: result.session,
        debug: result.debug,
        stripeConfig: result.stripeConfig,
      })
    } else {
      console.log("❌ [Session Debug] Session validation failed:", result.debug)
      return NextResponse.json({
        success: false,
        error: result.error?.message || "Session not found",
        debug: result.debug,
        recommendations: [
          "Check if you're using the correct Stripe key (test vs live)",
          "Verify the session ID is complete and correct",
          "Check if the session has expired (24 hour limit)",
          "Ensure the session was created in the same Stripe account",
        ],
      })
    }
  } catch (error) {
    console.error("❌ [Session Debug] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
