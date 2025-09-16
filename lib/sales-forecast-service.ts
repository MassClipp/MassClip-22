import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Stripe from "stripe"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export interface SalesForecastData {
  // Weekly projections (changed from monthly)
  projectedNextWeek: number
  pastWeekAverage: number
  weeklyGoal: number
  progressToGoal: number

  // Daily metrics
  dailyAverageRevenue: number
  projectedDailyRevenue: number

  // Trend analysis
  trendDirection: "up" | "down" | "stable"
  confidenceLevel: "high" | "medium" | "low"

  // Chart data for visualization
  chartData: Array<{
    date: string
    revenue: number
    isProjected: boolean
  }>

  // Motivational content
  motivationalMessage: string
}

// Helper function to safely convert to number
function safeNumber(value: any): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

// Helper function to get connected Stripe account
async function getConnectedStripeAccount(userId: string) {
  try {
    const connectedAccountDoc = await db.collection("connectedStripeAccounts").doc(userId).get()
    if (connectedAccountDoc.exists) {
      return connectedAccountDoc.data()
    }
    return null
  } catch (error) {
    console.error(`❌ [Forecast] Error fetching connected account:`, error)
    return null
  }
}

// Helper function to fetch Stripe earnings data for weekly forecast
async function getWeeklyStripeData(stripeAccountId: string) {
  try {
    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // Get 2 weeks of data

    const charges = await stripe.charges.list(
      {
        created: {
          gte: Math.floor(fourteenDaysAgo.getTime() / 1000),
        },
        limit: 100,
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    const successfulCharges = charges.data.filter((charge) => charge.status === "succeeded")

    // Group charges by day
    const dailyRevenue: { [key: string]: number } = {}

    successfulCharges.forEach((charge) => {
      const chargeDate = new Date(charge.created * 1000)
      const dateKey = chargeDate.toISOString().split("T")[0]
      const netAmount = (charge.amount - (charge.application_fee_amount || 0)) / 100

      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + netAmount
    })

    return {
      dailyRevenue,
      totalCharges: successfulCharges.length,
      hasData: successfulCharges.length > 0,
    }
  } catch (error) {
    console.error(`❌ [Forecast] Error fetching Stripe data:`, error)
    return {
      dailyRevenue: {},
      totalCharges: 0,
      hasData: false,
    }
  }
}

export class SalesForecastService {
  static async generateForecast(userId: string): Promise<SalesForecastData> {
    try {
      console.log(`📊 [Forecast] Generating weekly forecast for user: ${userId}`)

      // Get connected Stripe account
      const connectedAccount = await getConnectedStripeAccount(userId)

      if (!connectedAccount?.stripe_user_id || !connectedAccount.charges_enabled) {
        console.log(`⚠️ [Forecast] No connected Stripe account for user: ${userId}`)
        return this.createDefaultForecast("Connect your Stripe account to see sales forecasts")
      }

      const stripeData = await getWeeklyStripeData(connectedAccount.stripe_user_id)

      if (!stripeData.hasData) {
        console.log(`📊 [Forecast] No sales data available for user: ${userId}`)
        return this.createDefaultForecast("Start making sales to see your weekly forecast")
      }

      const now = new Date()
      const pastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get past week's actual revenue
      let pastWeekRevenue = 0
      let pastWeekDays = 0

      for (let i = 0; i < 7; i++) {
        const date = new Date(pastWeekStart.getTime() + i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split("T")[0]
        const dayRevenue = stripeData.dailyRevenue[dateKey] || 0
        pastWeekRevenue += dayRevenue
        if (dayRevenue > 0) pastWeekDays++
      }

      const pastWeekAverage = safeNumber(pastWeekRevenue)
      const dailyAverageRevenue = pastWeekDays > 0 ? pastWeekAverage / 7 : 0

      const projectedNextWeek = safeNumber(dailyAverageRevenue * 7)
      const projectedDailyRevenue = safeNumber(dailyAverageRevenue)

      // Set weekly goal (20% higher than past week average, minimum $50)
      const weeklyGoal = Math.max(50, pastWeekAverage * 1.2)
      const progressToGoal = weeklyGoal > 0 ? (pastWeekAverage / weeklyGoal) * 100 : 0

      // Determine trend from actual data
      const trendDirection = this.calculateTrend(stripeData.dailyRevenue)
      const confidenceLevel = this.calculateConfidence(stripeData.totalCharges, pastWeekDays)

      const chartData = this.generateRealisticChartData(stripeData.dailyRevenue, dailyAverageRevenue)

      // Generate motivational message
      const motivationalMessage = this.generateWeeklyMotivationalMessage(
        pastWeekAverage,
        projectedNextWeek,
        trendDirection,
        progressToGoal,
      )

      const forecast: SalesForecastData = {
        projectedNextWeek,
        pastWeekAverage,
        weeklyGoal: safeNumber(weeklyGoal),
        progressToGoal: safeNumber(progressToGoal),
        dailyAverageRevenue: safeNumber(dailyAverageRevenue),
        projectedDailyRevenue: safeNumber(projectedDailyRevenue),
        trendDirection,
        confidenceLevel,
        chartData,
        motivationalMessage,
      }

      console.log(`✅ [Forecast] Weekly forecast generated:`, {
        pastWeek: pastWeekAverage,
        projectedNextWeek,
        weeklyGoal,
        trend: trendDirection,
      })

      return forecast
    } catch (error) {
      console.error(`❌ [Forecast] Error generating forecast:`, error)
      return this.createDefaultForecast("Unable to generate forecast at this time")
    }
  }

  private static createDefaultForecast(message: string): SalesForecastData {
    return {
      projectedNextWeek: 0,
      pastWeekAverage: 0,
      weeklyGoal: 50, // Default weekly goal
      progressToGoal: 0,
      dailyAverageRevenue: 0,
      projectedDailyRevenue: 0,
      trendDirection: "stable",
      confidenceLevel: "low",
      chartData: [],
      motivationalMessage: message,
    }
  }

  private static calculateTrend(dailyRevenue: { [key: string]: number }): "up" | "down" | "stable" {
    const dates = Object.keys(dailyRevenue).sort()
    if (dates.length < 4) return "stable"

    const firstHalf = dates.slice(0, Math.floor(dates.length / 2))
    const secondHalf = dates.slice(Math.floor(dates.length / 2))

    const firstHalfAvg = firstHalf.reduce((sum, date) => sum + (dailyRevenue[date] || 0), 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, date) => sum + (dailyRevenue[date] || 0), 0) / secondHalf.length

    const difference = secondHalfAvg - firstHalfAvg
    const threshold = firstHalfAvg * 0.1 // 10% threshold

    if (difference > threshold) return "up"
    if (difference < -threshold) return "down"
    return "stable"
  }

  private static calculateConfidence(totalCharges: number, activeDays: number): "high" | "medium" | "low" {
    if (totalCharges >= 10 && activeDays >= 5) return "high"
    if (totalCharges >= 5 && activeDays >= 3) return "medium"
    return "low"
  }

  private static generateRealisticChartData(
    dailyRevenue: { [key: string]: number },
    dailyAverage: number,
  ): Array<{ date: string; revenue: number; isProjected: boolean }> {
    const chartData: Array<{ date: string; revenue: number; isProjected: boolean }> = []
    const now = new Date()

    // Add past 7 days (actual data)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split("T")[0]
      chartData.push({
        date: dateKey,
        revenue: safeNumber(dailyRevenue[dateKey] || 0),
        isProjected: false,
      })
    }

    // Add next 7 days (projected based on past week average)
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split("T")[0]
      // Add slight variation to projected values to make them realistic
      const variation = 0.8 + Math.random() * 0.4 // 80% to 120% of average
      chartData.push({
        date: dateKey,
        revenue: safeNumber(dailyAverage * variation),
        isProjected: true,
      })
    }

    return chartData
  }

  private static generateWeeklyMotivationalMessage(
    pastWeek: number,
    projectedNextWeek: number,
    trend: string,
    progressToGoal: number,
  ): string {
    const messages = {
      noSales: [
        "🚀 This week is your opportunity to make your first sale! Your audience is waiting.",
        "💡 Every successful creator started with zero sales. Your breakthrough week is coming!",
        "🎯 Focus on creating value this week - your first sale could be just around the corner.",
      ],
      lowSales: [
        "📈 You're building momentum! Each week brings new opportunities to grow.",
        "💪 Consistency is key - keep creating and your weekly earnings will compound.",
        "🌟 Small wins lead to big victories. This week could be your best yet!",
      ],
      goodSales: [
        "🔥 You're on fire! Your weekly performance shows real potential for growth.",
        "🎉 Great work this week! Your content is resonating with your audience.",
        "⚡ Your weekly momentum is building - keep pushing forward!",
      ],
      excellentSales: [
        "🏆 Outstanding weekly performance! You're setting the standard for success.",
        "💎 Your weekly earnings show you've mastered the art of content monetization.",
        "🚀 Incredible week! Your growth trajectory is inspiring.",
      ],
    }

    let category: keyof typeof messages
    if (pastWeek === 0) {
      category = "noSales"
    } else if (pastWeek < 25) {
      category = "lowSales"
    } else if (pastWeek < 100) {
      category = "goodSales"
    } else {
      category = "excellentSales"
    }

    const categoryMessages = messages[category]
    return categoryMessages[Math.floor(Math.random() * categoryMessages.length)]
  }
}
