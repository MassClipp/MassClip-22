import { type NextRequest, NextResponse } from "next/server"
import { SalesForecastService } from "@/lib/sales-forecast-service"
import { getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const userId = user.uid

    console.log(`📊 Fetching weekly sales forecast for user: ${userId}`)

    const forecast = await SalesForecastService.generateForecast(userId)

    return NextResponse.json(forecast)
  } catch (error) {
    console.error("❌ Error in weekly sales forecast API:", error)
    return NextResponse.json({ error: "Failed to generate weekly sales forecast" }, { status: 500 })
  }
}
