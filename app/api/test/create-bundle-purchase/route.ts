import { type NextRequest, NextResponse } from "next/server"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  console.log("🧪 [Test Bundle Purchase] Starting test purchase creation...")

  try {
    const body = await request.json()
    console.log("📋 [Test Bundle Purchase] Request body:", body)

    const { userId, bundleId, amount, currency = "usd", creatorId, sessionId, environment = "test" } = body

    // Validate required fields
    if (!userId || !bundleId) {
      console.error("❌ [Test Bundle Purchase] Missing required fields")
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "userId and bundleId are required",
          code: "MISSING_FIELDS",
        },
        { status: 400 },
      )
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || `test_${bundleId}_${Date.now()}`

    console.log("🔄 [Test Bundle Purchase] Creating unified purchase...")

    // Create the unified purchase using the service
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      bundleId,
      sessionId: finalSessionId,
      amount: amount || 999, // Default to $9.99 in cents
      currency,
      creatorId: creatorId || "test_creator",
      userEmail: `test_user_${userId.slice(-6)}@example.com`,
      userName: `Test User ${userId.slice(-6)}`,
    })

    console.log("✅ [Test Bundle Purchase] Purchase created successfully:", purchaseId)

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Test bundle purchase created successfully",
      purchaseId,
      sessionId: finalSessionId,
      details: {
        userId,
        bundleId,
        amount,
        currency,
        creatorId,
        environment,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Test Bundle Purchase] Error creating test purchase:", error)
    console.error("❌ [Test Bundle Purchase] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Failed to create test purchase",
        details: error.message || "Unknown error occurred",
        code: error.code || "INTERNAL_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
