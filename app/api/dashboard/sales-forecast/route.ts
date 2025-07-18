import { type NextRequest, NextResponse } from "next/server"
import { SalesForecastService } from "@/lib/sales-forecast-service"

async function getUserIdFromParams(request: NextRequest): Promise<string | null> {
  const { searchParams } = new URL(request.url)
  return searchParams.get("userId")
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromParams(request)

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`📊 Fetching sales forecast for user: ${userId}`)

    const forecast = await SalesForecastService.generateForecast(userId)

    return NextResponse.json(forecast)
  } catch (error) {
    console.error("❌ Error in sales forecast API:", error)
    return NextResponse.json({ error: "Failed to generate sales forecast" }, { status: 500 })
  }
}
