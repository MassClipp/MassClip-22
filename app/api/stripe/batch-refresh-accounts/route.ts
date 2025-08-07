import { type NextRequest, NextResponse } from "next/server"
import { batchRefreshStripeAccounts } from "@/lib/stripe-accounts-service"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Starting batch refresh of all Stripe accounts...")

    const results = await batchRefreshStripeAccounts()

    return NextResponse.json({
      success: true,
      message: "Batch refresh completed",
      results: {
        processed: results.processed,
        updated: results.updated,
        errors: results.errors,
        incompleteAccountsCount: results.incompleteAccounts.length,
        incompleteAccounts: results.incompleteAccounts,
      },
    })
  } catch (error) {
    console.error("❌ Batch refresh failed:", error)
    return NextResponse.json(
      { 
        error: "Batch refresh failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
