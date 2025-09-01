"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, TrendingDown, Minus, Target, Zap, Activity } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts"

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

export function SalesForecastCard() {
  const { forecast, loading, error } = useSalesForecast()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Weekly Forecast</CardTitle>
          </div>
          <CardDescription>Next 7 days projection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !forecast) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-zinc-200">Weekly Forecast</CardTitle>
            </div>
          </div>
          <CardDescription>Connect Stripe to see your revenue forecast</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <p className="text-zinc-400 mb-4">No Stripe data available</p>
            <p className="text-sm text-zinc-500">Connect your Stripe account to see real revenue forecasts</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = () => {
    switch (forecast.trendDirection) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-400" />
      default:
        return <Minus className="h-4 w-4 text-yellow-400" />
    }
  }

  const getTrendColor = () => {
    switch (forecast.trendDirection) {
      case "up":
        return "text-green-400"
      case "down":
        return "text-red-400"
      default:
        return "text-yellow-400"
    }
  }

  const getConfidenceColor = () => {
    switch (forecast.confidenceLevel) {
      case "high":
        return "text-green-400"
      case "medium":
        return "text-yellow-400"
      default:
        return "text-zinc-400"
    }
  }

  const getTrendLineColor = () => {
    switch (forecast.trendDirection) {
      case "up":
        return "#10b981" // Green for upward trend
      case "down":
        return "#ef4444" // Red for downward trend
      default:
        return "#6b7280" // Gray for stable
    }
  }

  const getTrendGradient = () => {
    switch (forecast.trendDirection) {
      case "up":
        return "from-green-500/20 to-transparent"
      case "down":
        return "from-red-500/20 to-transparent"
      default:
        return "from-gray-500/20 to-transparent"
    }
  }

  // Safely get values with fallbacks
  const projectedNextWeek = safeNumber(forecast.projectedNextWeek)
  const pastWeekAverage = safeNumber(forecast.pastWeekAverage)
  const dailyAverageRevenue = safeNumber(forecast.dailyAverageRevenue)
  const projectedDailyRevenue = safeNumber(forecast.projectedDailyRevenue)
  const weeklyGoal = safeNumber(forecast.weeklyGoal)
  const progressToGoal = safeNumber(forecast.progressToGoal)

  // Prepare chart data - ensure it's an array
  const chartData =
    Array.isArray(forecast.chartData) && forecast.chartData.length > 0 ? forecast.chartData.slice(-14) : []

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-zinc-200">Weekly Forecast</CardTitle>
            </div>
          </div>
          <CardDescription>Waiting for Stripe sales data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <p className="text-zinc-400 mb-4">No sales data yet</p>
            <p className="text-sm text-zinc-500">Make your first sale to see revenue forecasts</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Weekly Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {forecast.trendDirection?.toUpperCase() || "STABLE"}
            </span>
          </div>
        </div>
        <CardDescription>Next 7 days projection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projected Earnings */}
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">{formatCurrency(projectedNextWeek)}</span>
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>
              {forecast.confidenceLevel || "low"} confidence
            </span>
          </div>
          <p className="text-sm text-zinc-400">Based on {formatCurrency(dailyAverageRevenue)}/day average</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span className="font-medium">Performance Trend</span>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-current opacity-80"></div>
                <span>Historical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 border-t-2 border-dashed border-current opacity-60"></div>
                <span>Forecast</span>
              </div>
            </div>
          </div>

          <div className="relative h-32 w-full bg-zinc-800/20 rounded-lg border border-zinc-700/30 p-3">
            <div className={`absolute inset-0 bg-gradient-to-t ${getTrendGradient()} rounded-lg`}></div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  formatter={(value: any, name: string) => [
                    formatCurrency(value),
                    name === "revenue" ? "Revenue" : name,
                  ]}
                />
                <ReferenceLine
                  x={chartData[Math.floor(chartData.length / 2)]?.date}
                  stroke="#71717a"
                  strokeDasharray="2 2"
                  opacity={0.3}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={getTrendLineColor()}
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={getTrendLineColor()}
                        strokeWidth={payload?.isProjected ? 2 : 0}
                        stroke={payload?.isProjected ? "#fff" : "none"}
                        opacity={payload?.isProjected ? 0.8 : 1}
                      />
                    )
                  }}
                  activeDot={{ r: 4, fill: getTrendLineColor(), strokeWidth: 2, stroke: "#fff" }}
                  strokeDasharray={(entry: any, index: number) => {
                    const point = chartData[index]
                    return point?.isProjected ? "4 4" : "0"
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Goal Progress */}
        {weeklyGoal > 0 && (
          <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-300">Weekly Goal</span>
              <span className="text-sm font-medium text-zinc-200">{formatCurrency(weeklyGoal)}</span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressToGoal))}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">{Math.round(progressToGoal)}% of weekly goal achieved</p>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/50">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{formatCurrency(pastWeekAverage)}</p>
            <p className="text-xs text-zinc-400">Past Week</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-200">{formatCurrency(projectedDailyRevenue)}</p>
            <p className="text-xs text-zinc-400">Projected Daily</p>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-200 leading-relaxed">
              {forecast.motivationalMessage || "Keep creating great content!"}
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-1 pt-2">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500">Live Stripe data</span>
        </div>
      </CardContent>
    </Card>
  )
}
