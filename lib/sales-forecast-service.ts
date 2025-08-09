import { StripeEarningsService } from "@/lib/stripe-earnings-service"
import { ProductBoxSalesService } from "@/lib/product-box-sales-service"

export interface SalesForecastData {
  pastWeekAverage: number
  projectedNextWeek: number
  dailyAverageRevenue: number
  projectedDailyRevenue: number
  confidenceLevel: "low" | "medium" | "high"
  trendDirection: "up" | "down" | "stable"
  motivationalMessage: string
  chartData: {
    date: string
    revenue: number
    isProjected: boolean
  }[]
  weeklyGoal: number
  progressToGoal: number
}

export class SalesForecastService {
  /**
   * Generate weekly sales forecast based on the same data source as dashboard sales
   */
  static async generateForecast(userId: string): Promise<SalesForecastData> {
    console.log(`📊 Generating weekly sales forecast for user: ${userId}`)

    try {
      // Use the same data source as dashboard sales
      let salesData = null

      // Try Stripe first (same as dashboard)
      try {
        const stripeData = await StripeEarningsService.getEarningsData(userId)
        if (stripeData && !stripeData.error && stripeData.totalEarnings > 0) {
          // Calculate last 7 days from Stripe data
          const last7DaysRevenue = stripeData.last30DaysEarnings * (7 / 30) // Approximate weekly from monthly
          const last7DaysSales = Math.round(stripeData.salesMetrics?.last30DaysSales * (7 / 30)) || 0

          salesData = {
            lastWeekRevenue: last7DaysRevenue,
            lastWeekSales: last7DaysSales,
            totalRevenue: stripeData.totalEarnings || 0,
            recentTransactions: stripeData.recentTransactions || [],
          }
          console.log(`💳 Using live data for weekly forecast:`, {
            lastWeekRevenue: salesData.lastWeekRevenue,
            lastWeekSales: salesData.lastWeekSales,
          })
        }
      } catch (error) {
        console.warn(`⚠️ Primary data source failed, trying fallback:`, error)
      }

      // Fallback to ProductBoxSalesService if needed
      if (!salesData) {
        const fallbackData = await ProductBoxSalesService.getSalesStats(userId)
        // Convert monthly data to weekly approximation
        const weeklyRevenue = (fallbackData.last30DaysRevenue || 0) * (7 / 30)
        const weeklySales = Math.round((fallbackData.last30DaysSales || 0) * (7 / 30))

        salesData = {
          lastWeekRevenue: weeklyRevenue,
          lastWeekSales: weeklySales,
          totalRevenue: fallbackData.totalRevenue || 0,
          recentTransactions: fallbackData.recentSales || [],
        }
        console.log(`📦 Using fallback data for weekly forecast:`, {
          lastWeekRevenue: salesData.lastWeekRevenue,
          lastWeekSales: salesData.lastWeekSales,
        })
      }

      // Calculate metrics based on actual sales data
      const lastWeekRevenue = salesData.lastWeekRevenue
      const lastWeekSales = salesData.lastWeekSales
      const dailyAverageRevenue = lastWeekRevenue / 7

      // Set weekly goal based on performance level
      let weeklyGoal = 50 // Default goal for new creators
      if (lastWeekRevenue > 0) {
        weeklyGoal = Math.max(lastWeekRevenue * 1.2, 25) // 20% growth or minimum $25
      }

      // Calculate progress to goal
      const progressToGoal = weeklyGoal > 0 ? (lastWeekRevenue / weeklyGoal) * 100 : 0

      // For trend analysis, compare with previous period if we have enough data
      let trendDirection: "up" | "down" | "stable" = "stable"
      let trendMultiplier = 1

      // If we have recent sales, assume positive trend
      if (lastWeekRevenue > 0) {
        trendDirection = "up"
        trendMultiplier = 1.15 // Modest weekly growth assumption
      }

      // Calculate projected revenue for next week
      const baseProjection = dailyAverageRevenue * 7
      const trendAdjustedProjection = baseProjection * trendMultiplier
      const projectedNextWeek = Math.max(trendAdjustedProjection, 0)

      // Determine confidence level based on sales volume
      let confidenceLevel: "low" | "medium" | "high" = "low"
      if (lastWeekSales >= 3) {
        confidenceLevel = "high"
      } else if (lastWeekSales >= 1) {
        confidenceLevel = "medium"
      }

      // Generate motivational message
      const motivationalMessage = this.generateWeeklyMotivationalMessage(
        lastWeekRevenue,
        projectedNextWeek,
        trendDirection,
        confidenceLevel,
        progressToGoal,
      )

      // Generate chart data for the week
      const chartData = this.generateWeeklyChartData(lastWeekRevenue, dailyAverageRevenue, trendMultiplier)

      const forecastData: SalesForecastData = {
        pastWeekAverage: lastWeekRevenue,
        projectedNextWeek,
        dailyAverageRevenue,
        projectedDailyRevenue: dailyAverageRevenue * trendMultiplier,
        confidenceLevel,
        trendDirection,
        motivationalMessage,
        chartData,
        weeklyGoal,
        progressToGoal: Math.min(progressToGoal, 100), // Cap at 100%
      }

      console.log(`✅ Weekly sales forecast generated:`, {
        pastWeek: lastWeekRevenue,
        projected: projectedNextWeek,
        weeklyGoal,
        progressToGoal: progressToGoal.toFixed(1) + "%",
        trend: trendDirection,
        confidence: confidenceLevel,
      })

      return forecastData
    } catch (error) {
      console.error(`❌ Error generating weekly sales forecast:`, error)

      // Return aspirational forecast for new creators
      return {
        pastWeekAverage: 0,
        projectedNextWeek: 15, // Weekly goal for new creators
        dailyAverageRevenue: 0,
        projectedDailyRevenue: 2.14, // $15/7 days
        confidenceLevel: "low",
        trendDirection: "stable",
        motivationalMessage:
          "🚀 Ready to launch your first weekly sales? Create premium content and hit your $15 weekly goal!",
        chartData: this.generateEmptyWeeklyChartData(),
        weeklyGoal: 15,
        progressToGoal: 0,
      }
    }
  }

  /**
   * Generate weekly motivational message based on performance
   */
  private static generateWeeklyMotivationalMessage(
    pastWeek: number,
    projected: number,
    trend: "up" | "down" | "stable",
    confidence: "low" | "medium" | "high",
    progressToGoal: number,
  ): string {
    if (pastWeek === 0) {
      const motivationalMessages = [
        "🚀 Ready to launch your first weekly sales? Create premium content and watch your earnings grow!",
        "💡 Your weekly success journey starts with your first premium upload!",
        "🌟 Every successful creator started with zero weekly sales. Your breakthrough week is coming!",
        "🎯 This week is your week! Upload premium content and hit your weekly goal!",
        "⚡ Transform your passion into weekly profit. Your audience is waiting for premium content!",
      ]
      return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
    }

    // Goal-based messages
    if (progressToGoal >= 100) {
      return `🎉 Incredible! You've exceeded your weekly goal by ${(progressToGoal - 100).toFixed(0)}%! Time to set a higher target!`
    } else if (progressToGoal >= 75) {
      return `🔥 So close to your weekly goal! Just ${(100 - progressToGoal).toFixed(0)}% more to go. You've got this!`
    } else if (progressToGoal >= 50) {
      return `💪 Halfway to your weekly goal! Keep the momentum going strong!`
    }

    const messages = {
      up: {
        high: `🔥 Excellent weekly momentum! Your consistent sales show strong audience engagement. Scale up!`,
        medium: `📈 Great weekly progress! Your growing sales indicate solid market fit. Keep pushing!`,
        low: `🌱 Positive weekly signs! Your initial sales show promise. Build on this foundation!`,
      },
      stable: {
        high: `💪 Solid weekly performance! You've built reliable revenue. Ready to optimize and grow?`,
        medium: `⚖️ Steady weekly progress! Your consistent sales show reliability. Scale up your efforts!`,
        low: `🎯 Finding your weekly rhythm! Keep experimenting to unlock your full potential.`,
      },
      down: {
        high: `💡 Weekly fluctuations are normal. Your strong foundation means recovery is achievable!`,
        medium: `🔄 Time to innovate this week! Your audience is waiting for your next breakthrough content.`,
        low: `🌟 Every expert was once a beginner. Focus on quality and weekly growth will follow.`,
      },
    }

    return messages[trend][confidence]
  }

  /**
   * Generate chart data for the current and next week
   */
  private static generateWeeklyChartData(
    actualRevenue: number,
    dailyAverage: number,
    trendMultiplier: number,
  ): { date: string; revenue: number; isProjected: boolean }[] {
    const chartData: { date: string; revenue: number; isProjected: boolean }[] = []
    const now = new Date()

    // Generate past 7 days - distribute actual revenue across the period
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

      // Distribute revenue with some realistic variance
      const baseDaily = actualRevenue / 7
      const variance = 0.5 + Math.random() * 1.5 // 0.5x to 2x variance
      const dayRevenue = baseDaily * variance

      chartData.push({
        date: date.toISOString().split("T")[0],
        revenue: Math.max(dayRevenue, 0),
        isProjected: false,
      })
    }

    // Generate projected 7 days
    const projectedDailyRevenue = dailyAverage * trendMultiplier
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)

      // Add realistic variance to projections
      const variance = 0.8 + Math.random() * 0.4 // 0.8 to 1.2
      const projectedRevenue = projectedDailyRevenue * variance

      chartData.push({
        date: date.toISOString().split("T")[0],
        revenue: Math.max(projectedRevenue, 0),
        isProjected: true,
      })
    }

    return chartData
  }

  /**
   * Generate aspirational chart data for creators with no sales
   */
  private static generateEmptyWeeklyChartData(): { date: string; revenue: number; isProjected: boolean }[] {
    const chartData: { date: string; revenue: number; isProjected: boolean }[] = []
    const now = new Date()

    // Generate past 7 days with zero revenue
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      chartData.push({
        date: date.toISOString().split("T")[0],
        revenue: 0,
        isProjected: false,
      })
    }

    // Generate projected 7 days with gradual growth
    const baseProjection = 2.14 // $15/7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const growthFactor = Math.min(i / 7, 1)
      const projectedRevenue = baseProjection * (0.5 + growthFactor * 1.5)

      chartData.push({
        date: date.toISOString().split("T")[0],
        revenue: projectedRevenue,
        isProjected: true,
      })
    }

    return chartData
  }
}
