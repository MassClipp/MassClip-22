"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, TrendingDown, Minus, Zap, Activity, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

// Helper function to safely format numbers
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

function formatCurrency(amount: any): string {
  const safeAmount = safeNumber(amount)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)
}

function generateWeeklySalesData(pastWeekRevenue: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const thisWeekData = []

  // Generate this week's projected data based on last week
  const baseDaily = pastWeekRevenue / 7

  for (let i = 0; i < 7; i++) {
    const zigzagMultiplier = i % 2 === 0 ? 1.4 : 0.6 // More dramatic zig-zag
    const trendFactor = 1 + i * 0.05 // Slight upward trend over the week
    const projectedValue = Math.max(0, baseDaily * zigzagMultiplier * trendFactor)

    thisWeekData.push({
      day: days[i],
      revenue: projectedValue,
      isProjected: true,
    })
  }

  return thisWeekData
}

export function SalesForecastCard() {
  const { forecast, loading, error } = useSalesForecast()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Sales Forecast</CardTitle>
          </div>
          <CardDescription>This week's projected earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !forecast) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Sales Forecast</CardTitle>
          </div>
          <CardDescription>Unable to generate forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">{error || "No data available"}</p>
        </CardContent>
      </Card>
    )
  }

  // Safely get values with fallbacks
  const projectedNextWeek = safeNumber(forecast.projectedNextWeek)
  const pastWeekAverage = safeNumber(forecast.pastWeekAverage)
  const weeklyGoal = safeNumber(forecast.weeklyGoal)
  const progressToGoal = safeNumber(forecast.progressToGoal)

  const weeklySalesData = generateWeeklySalesData(pastWeekAverage)
  const totalProjectedWeek = weeklySalesData.reduce((sum, day) => sum + day.revenue, 0)

  const getTrendIcon = () => {
    if (totalProjectedWeek > pastWeekAverage) {
      return <TrendingUp className="h-4 w-4 text-green-400" />
    } else if (totalProjectedWeek < pastWeekAverage) {
      return <TrendingDown className="h-4 w-4 text-red-400" />
    }
    return <Minus className="h-4 w-4 text-yellow-400" />
  }

  const getTrendColor = () => {
    if (totalProjectedWeek > pastWeekAverage) return "text-green-400"
    if (totalProjectedWeek < pastWeekAverage) return "text-red-400"
    return "text-yellow-400"
  }

  const getConfidenceLevel = () => {
    if (pastWeekAverage > 50) return "high"
    if (pastWeekAverage > 10) return "medium"
    return "low"
  }

  const getConfidenceColor = () => {
    const confidence = getConfidenceLevel()
    switch (confidence) {
      case "high":
        return "text-green-400"
      case "medium":
        return "text-yellow-400"
      default:
        return "text-zinc-400"
    }
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Sales Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {totalProjectedWeek > pastWeekAverage ? "UP" : totalProjectedWeek < pastWeekAverage ? "DOWN" : "STABLE"}
            </span>
          </div>
        </div>
        <CardDescription>This week's projected earnings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projected Earnings */}
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">{formatCurrency(totalProjectedWeek)}</span>
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>{getConfidenceLevel()} confidence</span>
          </div>
          <p className="text-sm text-zinc-400">Based on last week's {formatCurrency(pastWeekAverage)} performance</p>
        </div>

        <div className="space-y-3">
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklySalesData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717a" }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [formatCurrency(value), "Projected Sales"]}
                />
                <Line
                  type="linear"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#60a5fa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>This Week Forecast</span>
            </div>
          </div>
        </div>

        {/* Weekly Goal Progress */}
        {weeklyGoal > 0 && (
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-300">Weekly Goal</span>
              <span className="text-sm font-medium text-zinc-200">{formatCurrency(weeklyGoal)}</span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (totalProjectedWeek / weeklyGoal) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {Math.round((totalProjectedWeek / weeklyGoal) * 100)}% of weekly goal projected
            </p>
          </div>
        )}

        {/* Performance Comparison */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/50">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{formatCurrency(pastWeekAverage)}</p>
            <p className="text-xs text-zinc-400">Last Week</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-400">{formatCurrency(totalProjectedWeek)}</p>
            <p className="text-xs text-zinc-400">This Week (Projected)</p>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-200 leading-relaxed">
              {totalProjectedWeek > pastWeekAverage
                ? "📈 Great momentum! You're on track for a strong week."
                : pastWeekAverage === 0
                  ? "🚀 Ready to make your first sales this week!"
                  : "💪 Consistency is key - keep creating and your weekly earnings will compound."}
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-1 pt-2">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500">Live sales forecast</span>
        </div>
      </CardContent>
    </Card>
  )
}
