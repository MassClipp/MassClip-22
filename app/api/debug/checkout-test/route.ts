import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { bundleId } = await request.json()

    if (!bundleId) {
      return NextResponse.json(
        { error: "Bundle ID is required" },
        { status: 400 }
      )
    }

    console.log("🔍 [Debug] Testing bundle configuration for:", bundleId)

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    
    if (!bundleDoc.exists) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    const bundleData = bundleDoc.data()
    console.log("📦 [Debug] Bundle data:", {
      id: bundleId,
      title: bundleData?.title,
      price: bundleData?.price,
      creatorId: bundleData?.creatorId,
      stripePriceId: bundleData?.stripePriceId,
    })

    // Check if bundle has required fields
    const missingFields = []
    if (!bundleData?.price) missingFields.push("price")
    if (!bundleData?.creatorId) missingFields.push("creatorId")
    if (!bundleData?.stripePriceId) missingFields.push("stripePriceId")

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: "Bundle missing required fields",
          missingFields,
          bundleData: {
            title: bundleData?.title,
            price: bundleData?.price,
            creatorId: bundleData?.creatorId,
            stripePriceId: bundleData?.stripePriceId,
          }
        },
        { status: 400 }
      )
    }

    // Check creator's Stripe account
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    const creatorData = creatorDoc.data()

    console.log("👤 [Debug] Creator data:", {
      id: bundleData.creatorId,
      stripeAccountId: creatorData?.stripeAccountId,
      stripeAccountStatus: creatorData?.stripeAccountStatus,
    })

    if (!creatorData?.stripeAccountId) {
      return NextResponse.json(
        { 
          error: "Creator has not connected their Stripe account",
          creatorId: bundleData.creatorId,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundleId,
        title: bundleData.title,
        price: bundleData.price,
        stripePriceId: bundleData.stripePriceId,
      },
      creator: {
        id: bundleData.creatorId,
        stripeAccountId: creatorData.stripeAccountId,
        stripeAccountStatus: creatorData.stripeAccountStatus,
      },
    })

  } catch (error) {
    console.error("❌ [Debug] Checkout test error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
