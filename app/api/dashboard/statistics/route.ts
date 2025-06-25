export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { StatisticsService } from "@/lib/statistics-service"
import { getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    // Get user statistics
    const statistics = await StatisticsService.getUserStatistics(user.uid)

    return NextResponse.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const body = await request.json()

    switch (body.action) {
      case "increment_download":
        await StatisticsService.incrementDownloadCount(body.uploadId, user.uid)
        break

      case "increment_profile_views":
        await StatisticsService.incrementProfileViews(user.uid)
        break

      case "record_sale":
        await StatisticsService.recordSale(user.uid, body.saleData)
        break

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
