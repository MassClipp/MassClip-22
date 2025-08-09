import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface SalesForecastData {
  currentWeekRevenue: number
  projectedWeeklyRevenue: number
  dailyAverageRevenue: number
  projectedDailyRevenue: number
  confidenceLevel: "low" | "medium" | "high"
  trendDirection: "up" | "down" | "stable"
  motivationalMessage: string
  weekStartDate: string
  weekEndDate: string
  chartData: {
    date: string
    revenue: number
    isProjected: boolean
  }[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`📊 Generating weekly sales forecast for user: ${userId}`)

    // Get user's Stripe account
    const { db } = await import("@/lib/firebase-admin")
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      // Return aspirational forecast for users without Stripe
      return NextResponse.json(generateAspirationForecast())
    }

    // Calculate current week dates (Monday to Sunday)
    const now = new Date()
    const currentDay = now.getDay()
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // Handle Sunday as 0
    const weekStart = new Date(now.getTime() + mondayOffset * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    weekEnd.setHours(23, 59, 59, 999)

    // Get previous 4 weeks for trend analysis
    const fourWeeksAgo = new Date(weekStart.getTime() - 28 * 24 * 60 * 60 * 1000)

    console.log(`📅 Current week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)

    // Fetch charges from Stripe
    const charges = await stripe.charges.list(
      {
        limit: 100,
        created: {
          gte: Math.floor(fourWeeksAgo.getTime() / 1000),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    const successfulCharges = charges.data.filter((charge) => charge.status === "succeeded" && charge.paid)

    // Current week charges
    const currentWeekCharges = successfulCharges.filter((charge) => {
      const chargeDate = new Date(charge.created * 1000)
      return chargeDate >= weekStart && chargeDate <= weekEnd
    })

    const currentWeekRevenue = currentWeekCharges.reduce((sum, charge) => {
      const grossAmount = charge.amount / 100
      const netAmount = grossAmount - (charge.application_fee_amount || 0) / 100
      return sum + netAmount
    }, 0)

    // Previous weeks for trend analysis
    const previousWeeksData = []
    for (let i = 1; i <= 4; i++) {
      const weekStartDate = new Date(weekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000)

      const weekCharges = successfulCharges.filter((charge) => {
        const chargeDate = new Date(charge.created * 1000)
        return chargeDate >= weekStartDate && chargeDate <= weekEndDate
      })

      const weekRevenue = weekCharges.reduce((sum, charge) => {
        const grossAmount = charge.amount / 100
        const netAmount = grossAmount - (charge.application_fee_amount || 0) / 100
        return sum + netAmount
      }, 0)

      previousWeeksData.push({
        week: i,
        revenue: weekRevenue,
        sales: weekCharges.length,
      })
    }

    // Calculate trend
    const recentWeeksAverage = previousWeeksData.slice(0, 2).reduce((sum, week) => sum + week.revenue, 0) / 2
    const olderWeeksAverage = previousWeeksData.slice(2, 4).reduce((sum, week) => sum + week.revenue, 0) / 2

    let trendDirection: "up" | "down" | "stable" = "stable"
    let trendMultiplier = 1

    if (recentWeeksAverage > olderWeeksAverage * 1.1) {
      trendDirection = "up"
      trendMultiplier = 1.2
    } else if (recentWeeksAverage < olderWeeksAverage * 0.9) {
      trendDirection = "down"
      trendMultiplier = 0.8
    }

    // Calculate projections
    const averageWeeklyRevenue = previousWeeksData.reduce((sum, week) => sum + week.revenue, 0) / 4
    const dailyAverageRevenue = averageWeeklyRevenue / 7
    const projectedWeeklyRevenue = Math.max(averageWeeklyRevenue * trendMultiplier, 0)
    const projectedDailyRevenue = projectedWeeklyRevenue / 7

    // Determine confidence level
    const totalPreviousSales = previousWeeksData.reduce((sum, week) => sum + week.sales, 0)
    let confidenceLevel: "low" | "medium" | "high" = "low"
    if (totalPreviousSales >= 20) {
      confidenceLevel = "high"
    } else if (totalPreviousSales >= 8) {
      confidenceLevel = "medium"
    }

    // Generate motivational message
    const motivationalMessage = generateWeeklyMotivationalMessage(
      currentWeekRevenue,
      projectedWeeklyRevenue,
      trendDirection,
      confidenceLevel,
    )

    // Generate chart data for the week
    const chartData = generateWeeklyChartData(weekStart, currentWeekRevenue, projectedDailyRevenue)

    const forecastData: SalesForecastData = {
      currentWeekRevenue: Number(currentWeekRevenue.toFixed(2)),
      projectedWeeklyRevenue: Number(projectedWeeklyRevenue.toFixed(2)),
      dailyAverageRevenue: Number(dailyAverageRevenue.toFixed(2)),
      projectedDailyRevenue: Number(projectedDailyRevenue.toFixed(2)),
      confidenceLevel,
      trendDirection,
      motivationalMessage,
      weekStartDate: weekStart.toISOString().split("T")[0],
      weekEndDate: weekEnd.toISOString().split("T")[0],
      chartData,
    }

    console.log(`✅ Weekly forecast generated:`, {
      currentWeek: currentWeekRevenue,
      projected: projectedWeeklyRevenue,
      trend: trendDirection,
      confidence: confidenceLevel,
    })

    return NextResponse.json(forecastData)
  } catch (error) {
    console.error(`❌ Error generating weekly sales forecast:`, error)
    return NextResponse.json({ error: "Failed to generate sales forecast" }, { status: 500 })
  }
}

function generateAspirationForecast(): SalesForecastData {
  const now = new Date()
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const weekStart = new Date(now.getTime() + mondayOffset * 24 * 60 * 60 * 1000)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)

  return {
    currentWeekRevenue: 0,
    projectedWeeklyRevenue: 75,
    dailyAverageRevenue: 0,
    projectedDailyRevenue: 10.71,
    confidenceLevel: "low",
    trendDirection: "stable",
    motivationalMessage:
      "🚀 Ready to launch your first weekly sales? Create premium content and watch your earnings grow!",
    weekStartDate: weekStart.toISOString().split("T")[0],
    weekEndDate: weekEnd.toISOString().split("T")[0],
    chartData: generateEmptyWeeklyChartData(weekStart),
  }
}

function generateWeeklyMotivationalMessage(
  currentWeek: number,
  projected: number,
  trend: "up" | "down" | "stable",
  confidence: "low" | "medium" | "high",
): string {
  if (currentWeek === 0) {
    const messages = [
      "🎯 This week is your canvas! Create premium content and paint your success story.",
      "⚡ Every successful creator started with week one. Your breakthrough week starts now!",
      "🌟 Transform this week into your first revenue milestone. Your audience is ready!",
      "🚀 Week by week, success builds. Make this week count with premium uploads!",
      "💡 Your weekly earnings journey begins now. Premium content = premium results!",
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const messages = {
    up: {
      high: `🔥 Incredible weekly momentum! Your consistent growth shows strong market demand!`,
      medium: `📈 Great weekly progress! Your upward trend indicates solid audience engagement!`,
      low: `🌱 Positive weekly signals! Your growth trajectory shows real potential!`,
    },
    stable: {
      high: `💪 Solid weekly performance! You've built reliable weekly revenue streams!`,
      medium: `⚖️ Steady weekly progress! Your consistent performance shows reliability!`,
      low: `🎯 Finding your weekly rhythm! Keep building momentum week by week!`,
    },
    down: {
      high: `💡 Weekly fluctuations are normal! Your strong foundation means quick recovery!`,
      medium: `🔄 Time for weekly innovation! Your audience is waiting for fresh content!`,
      low: `🌟 Every week is a new opportunity! Focus on quality and growth will follow!`,
    },
  }

  return messages[trend][confidence]
}

function generateWeeklyChartData(
  weekStart: Date,
  currentWeekRevenue: number,
  projectedDailyRevenue: number,
): { date: string; revenue: number; isProjected: boolean }[] {
  const chartData: { date: string; revenue: number; isProjected: boolean }[] = []
  const now = new Date()

  // Generate data for each day of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
    const isToday = date.toDateString() === now.toDateString()
    const isPast = date < now
    const isProjected = !isPast && !isToday

    let dayRevenue = 0
    if (isPast || isToday) {
      // Distribute current week revenue across past days with some variance
      const baseDailyRevenue = currentWeekRevenue / 7
      const variance = 0.5 + Math.random() * 1.5
      dayRevenue = baseDailyRevenue * variance
    } else {
      // Use projected daily revenue for future days
      const variance = 0.8 + Math.random() * 0.4
      dayRevenue = projectedDailyRevenue * variance
    }

    chartData.push({
      date: date.toISOString().split("T")[0],
      revenue: Math.max(dayRevenue, 0),
      isProjected,
    })
  }

  return chartData
}

function generateEmptyWeeklyChartData(weekStart: Date): { date: string; revenue: number; isProjected: boolean }[] {
  const chartData: { date: string; revenue: number; isProjected: boolean }[] = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
    const isPast = date < now
    const isProjected = !isPast

    let dayRevenue = 0
    if (isProjected) {
      // Gradual growth projection for new creators
      const baseProjection = 10.71 // $75/7 days
      const growthFactor = (i + 1) / 7
      dayRevenue = baseProjection * (0.5 + growthFactor * 1.5)
    }

    chartData.push({
      date: date.toISOString().split("T")[0],
      revenue: dayRevenue,
      isProjected,
    })
  }

  return chartData
}
