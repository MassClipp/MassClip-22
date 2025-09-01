"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
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

export function SalesForecastCard() {
  const { forecast, loading, error } = useSalesForecast()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !forecast) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardContent className="p-4">
          <div className="h-32 flex items-center justify-center">
            <p className="text-zinc-400 text-sm">Connect Stripe to see revenue data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData =
    Array.isArray(forecast.chartData) && forecast.chartData.length > 0 ? forecast.chartData.slice(-14) : []

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardContent className="p-4">
          <div className="h-32 flex items-center justify-center">
            <p className="text-zinc-400 text-sm">No sales data available</p>
          </div>
        </CardContent>
      </Card>
    )
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

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardContent className="p-4">
        <div className="h-32 w-full">
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
                formatter={(value: any, name: string) => [formatCurrency(value), name === "revenue" ? "Revenue" : name]}
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
      </CardContent>
    </Card>
  )
}
