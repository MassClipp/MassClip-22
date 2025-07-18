import { type NextRequest, NextResponse } from "next/server"
import { SalesForecastService } from "@/lib/sales-forecast-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

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
