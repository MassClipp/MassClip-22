import { type NextRequest, NextResponse } from "next/server"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  console.log("🛒 [Test Add Bundle] Starting bundle purchase addition...")

  try {
    const body = await request.json()
    console.log("📋 [Test Add Bundle] Request body:", body)

    const {
      userId,
      userEmail,
      userName,
      bundleId,
      bundleTitle,
      bundleDescription,
      bundleThumbnail,
      creatorId,
      creatorName,
      creatorUsername,
      amount,
      currency = "usd",
      sessionId,
      environment = "test",
    } = body

    // Validate required fields
    if (!userId || !bundleId || !creatorId) {
      console.error("❌ [Test Add Bundle] Missing required fields:", { userId, bundleId, creatorId })
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "userId, bundleId, and creatorId are required",
          code: "MISSING_FIELDS",
        },
        { status: 400 },
      )
    }

    console.log("🔄 [Test Add Bundle] Creating unified purchase with details:", {
      userId,
      userEmail,
      userName,
      bundleId,
      bundleTitle,
      creatorId,
      creatorName,
      amount,
      currency,
      sessionId,
    })

    // Create the unified purchase using the service
    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      bundleId,
      sessionId: sessionId || `test_${bundleId}_${Date.now()}`,
      amount: amount || 999, // Default to $9.99 in cents
      currency,
      creatorId,
      userEmail,
      userName,
    })

    console.log("✅ [Test Add Bundle] Purchase created successfully:", purchaseId)

    // Prepare detailed response for logging/implementation
    const purchaseDetails = {
      // Purchase identifiers
      purchaseId,
      sessionId: sessionId || `test_${bundleId}_${Date.now()}`,

      // User information
      buyer: {
        uid: userId,
        email: userEmail,
        name: userName,
        isAuthenticated: true,
      },

      // Bundle information
      bundle: {
        id: bundleId,
        title: bundleTitle,
        description: bundleDescription,
        thumbnailUrl: bundleThumbnail,
      },

      // Creator information
      creator: {
        id: creatorId,
        name: creatorName,
        username: creatorUsername,
      },

      // Purchase details
      payment: {
        amount,
        currency,
        amountFormatted: `$${(amount / 100).toFixed(2)}`,
        timestamp: new Date().toISOString(),
      },

      // Environment info
      environment,
      testPurchase: true,

      // Implementation notes
      implementationNotes: {
        message: "This data structure should be used in the real checkout flow",
        requiredFields: ["userId", "bundleId", "creatorId", "sessionId", "amount"],
        unifiedPurchaseService: "Use UnifiedPurchaseService.createUnifiedPurchase()",
        webhookIntegration: "This should be called from Stripe webhook after successful payment",
      },
    }

    console.log("📊 [Test Add Bundle] Complete purchase details for implementation:", purchaseDetails)

    // Return success response with detailed information
    return NextResponse.json({
      success: true,
      message: "Bundle added to purchases successfully",
      purchaseId,
      purchaseDetails,
      implementationGuide: {
        step1: "In Stripe webhook, extract session data",
        step2: "Get bundle and creator information from database",
        step3: "Call UnifiedPurchaseService.createUnifiedPurchase() with this data structure",
        step4: "Send confirmation email to buyer with purchase details",
      },
    })
  } catch (error: any) {
    console.error("❌ [Test Add Bundle] Error adding bundle to purchases:", error)
    console.error("❌ [Test Add Bundle] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Failed to add bundle to purchases",
        details: error.message || "Unknown error occurred",
        code: error.code || "INTERNAL_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
