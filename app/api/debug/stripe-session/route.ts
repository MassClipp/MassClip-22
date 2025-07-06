import { type NextRequest, NextResponse } from "next/server"
import { validateStripeSession } from "@/lib/stripe-client"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Debug Session] Validating session:", sessionId.substring(0, 20) + "...")

    const result = await validateStripeSession(sessionId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ [Debug Session] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to validate session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
