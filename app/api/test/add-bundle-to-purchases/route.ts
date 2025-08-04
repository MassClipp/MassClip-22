import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Add Bundle to Purchases] Starting request")

    const body = await request.json()
    const { userId, bundleId } = body

    console.log("📝 [Add Bundle to Purchases] Request data:", { userId, bundleId })

    if (!userId || !bundleId) {
      return NextResponse.json(
        { error: "Missing required fields", details: "userId and bundleId are required" },
        { status: 400 },
      )
    }

    // First, verify the bundle exists
    console.log("🔍 [Add Bundle to Purchases] Checking if bundle exists...")
    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Add Bundle to Purchases] Bundle ${bundleId} not found`)
      return NextResponse.json(
        { error: "Bundle not found", details: `Bundle with ID ${bundleId} does not exist` },
        { status: 404 },
      )
    }

    const bundleData = bundleDoc.data()!
    console.log("📦 [Add Bundle to Purchases] Bundle found:", {
      title: bundleData.title,
      creatorId: bundleData.creatorId,
      price: bundleData.price,
    })

    // Get creator information
    const creatorId = bundleData.creatorId || "unknown"
    let creatorData = null

    if (creatorId !== "unknown") {
      try {
        const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
          console.log("👤 [Add Bundle to Purchases] Creator found:", {
            name: creatorData?.displayName || creatorData?.name,
            username: creatorData?.username,
          })
        }
      } catch (error) {
        console.warn("⚠️ [Add Bundle to Purchases] Could not fetch creator data:", error)
      }
    }

    // Get user information if possible
    let userEmail = ""
    let userName = "User"

    try {
      const { auth } = await import("@/lib/firebase-admin")
      const userRecord = await auth.getUser(userId)
      userEmail = userRecord.email || ""
      userName = userRecord.displayName || userRecord.email?.split("@")[0] || "User"
      console.log("👤 [Add Bundle to Purchases] User found:", { userName, userEmail })
    } catch (error) {
      console.warn("⚠️ [Add Bundle to Purchases] Could not fetch user data:", error)
      // Continue without user data
    }

    // Create the purchase using UnifiedPurchaseService
    const sessionId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log("💾 [Add Bundle to Purchases] Creating unified purchase...")

    const purchaseId = await UnifiedPurchaseService.createUnifiedPurchase(userId, {
      bundleId,
      sessionId,
      amount: bundleData.price || 0,
      currency: "USD",
      creatorId,
      userEmail,
      userName,
    })

    console.log("✅ [Add Bundle to Purchases] Purchase created successfully:", purchaseId)

    // Return success response with bundle and purchase details
    return NextResponse.json({
      success: true,
      message: "Bundle added to purchases successfully",
      data: {
        purchaseId,
        sessionId,
        userId,
        bundleId,
        bundleTitle: bundleData.title || "Untitled Bundle",
        bundleDescription: bundleData.description || "",
        creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        amount: bundleData.price || 0,
        currency: "USD",
        purchasedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ [Add Bundle to Purchases] Error:", error)

    return NextResponse.json(
      {
        error: "Failed to add bundle to purchases",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
