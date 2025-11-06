import { NextResponse } from "next/server"
import { setupPurchasesIndexes } from "@/scripts/setup-purchases-indexes"

export async function POST() {
  try {
    console.log("🔧 [Setup Purchases Indexes API] Starting index setup...")

    const result = await setupPurchasesIndexes()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        indexUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`,
        requiredIndexes: [
          {
            collection: "bundlePurchases",
            fields: [
              { field: "buyerUid", order: "ASCENDING" },
              { field: "createdAt", order: "DESCENDING" },
            ],
          },
          {
            collection: "bundlePurchases",
            fields: [
              { field: "buyerUid", order: "ASCENDING" },
              { field: "purchasedAt", order: "DESCENDING" },
            ],
          },
        ],
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Setup Purchases Indexes API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to setup indexes",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to setup Firestore indexes for purchases",
    indexUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`,
    requiredIndexes: [
      {
        collection: "bundlePurchases",
        fields: [
          { field: "buyerUid", order: "ASCENDING" },
          { field: "createdAt", order: "DESCENDING" },
        ],
      },
      {
        collection: "bundlePurchases",
        fields: [
          { field: "buyerUid", order: "ASCENDING" },
          { field: "purchasedAt", order: "DESCENDING" },
        ],
      },
    ],
  })
}
