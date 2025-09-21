"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, TrendingDown, Minus, Target, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount)
}

function formatSimpleCurrency(amount: any): string {
  const safeAmount = safeNumber(amount)
  if (safeAmount >= 1000) {
    return `$${(safeAmount / 1000).toFixed(1)}k`
  }
  return `$${safeAmount.toFixed(0)}`
}

export function SalesForecastCard() {
  const { forecast, loading, error } = useSalesForecast()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Revenue Forecast</CardTitle>
          </div>
          <CardDescription>7-day projection based on past week sales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-64 w-full" />
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
              <CardTitle className="text-zinc-200">Revenue Forecast</CardTitle>
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

  let chartData = []
  if (Array.isArray(forecast.chartData) && forecast.chartData.length > 0) {
    chartData = forecast.chartData.slice(-14) // Show last 14 days
  } else {
    // Create minimal data points to show the chart structure
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      chartData.push({
        date: date.toISOString().split("T")[0],
        revenue: 0,
        isProjected: false,
      })
    }
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      chartData.push({
        date: date.toISOString().split("T")[0],
        revenue: 0,
        isProjected: true,
      })
    }
  }

  const pastWeekRevenue = chartData
    .filter((item) => !item.isProjected)
    .reduce((sum, item) => sum + safeNumber(item.revenue), 0)

  const projectedWeekRevenue = chartData
    .filter((item) => item.isProjected)
    .reduce((sum, item) => sum + safeNumber(item.revenue), 0)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Revenue Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {forecast.trendDirection?.toUpperCase() || "STABLE"}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <CardDescription>Next 7 days based on recent performance</CardDescription>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-white rounded"></div>
              <span className="text-zinc-400">Past week: {formatSimpleCurrency(pastWeekRevenue)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-white/60 rounded border-dashed border border-white/60"></div>
              <span className="text-zinc-400">Projected: {formatSimpleCurrency(projectedWeekRevenue)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-48 w-full px-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(value) => formatSimpleCurrency(value)}
                domain={["dataMin", "dataMax"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                }}
                formatter={(value: any, name: string, props: any) => [
                  formatCurrency(value),
                  props.payload?.isProjected ? "Projected" : "Actual",
                ]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#ffffff"
                strokeWidth={2}
                strokeDasharray={(entry: any) => (entry?.isProjected ? "4 4" : "0")}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={payload?.isProjected ? "#ffffff60" : "#ffffff"}
                      strokeWidth={1}
                      stroke="#18181b"
                    />
                  )
                }}
                activeDot={{
                  r: 4,
                  fill: "#ffffff",
                  strokeWidth: 2,
                  stroke: "#18181b",
                }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-2 p-3 border-t border-zinc-800/50">
          <DollarSign className="h-3 w-3 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            {projectedWeekRevenue > pastWeekRevenue
              ? "Trending up"
              : projectedWeekRevenue < pastWeekRevenue
                ? "Trending down"
                : "Staying steady"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
