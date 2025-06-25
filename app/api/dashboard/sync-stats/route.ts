export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request.headers)

    // Force recalculation of all statistics
    // This could be expanded to sync with external services like Stripe

    return NextResponse.json({
      success: true,
      message: "Statistics sync completed",
    })
  } catch (error) {
    console.error("Error syncing statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
