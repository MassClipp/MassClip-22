"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, TrendingDown, Minus, Target, Activity } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"

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
            <CardTitle className="text-zinc-200">Revenue Forecast</CardTitle>
          </div>
          <CardDescription>Next 7 days projection</CardDescription>
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

  const chartData =
    Array.isArray(forecast.chartData) && forecast.chartData.length > 0
      ? forecast.chartData.slice(-7) // Only show last 7 days
      : []

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-zinc-200">Revenue Forecast</CardTitle>
            </div>
          </div>
          <CardDescription>Next 7 days projection</CardDescription>
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
            <CardTitle className="text-zinc-200">Revenue Forecast</CardTitle>
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
      <CardContent className="p-0">
        <div className="h-64 w-full" style={{ width: "100%", height: "256px" }}>
          <LineChart
            width={800}
            height={256}
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            style={{ width: "100%", height: "100%" }}
          >
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "14px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              labelFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              }}
              formatter={(value: any) => [formatCurrency(value), "Revenue"]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#ffffff"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#ffffff"
                    strokeWidth={2}
                    stroke="#18181b"
                    style={{
                      filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))",
                    }}
                    opacity={payload?.isProjected ? 0.8 : 1}
                  />
                )
              }}
              activeDot={{
                r: 6,
                fill: "#ffffff",
                strokeWidth: 3,
                stroke: "#18181b",
                style: {
                  filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))",
                },
              }}
              strokeDasharray={(entry: any, index: number) => {
                const point = chartData[index]
                return point?.isProjected ? "6 6" : "0"
              }}
              style={{
                filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))",
              }}
            />
          </LineChart>
        </div>

        <div className="flex items-center justify-center gap-1 p-4">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500">Live Stripe data</span>
        </div>
      </CardContent>
    </Card>
  )
}
