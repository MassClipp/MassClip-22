"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

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

  const baseDaily = Math.max(pastWeekRevenue / 7, 5) // Minimum $5 for visualization

  for (let i = 0; i < 7; i++) {
    // Create more pronounced zig-zag with alternating high/low values
    const zigzagMultiplier = i % 2 === 0 ? 2.2 : 0.4
    const trendFactor = 1 + i * 0.15 // Stronger upward trend
    const randomVariation = 0.8 + Math.random() * 0.4 // Add some randomness
    const projectedValue = Math.max(2, baseDaily * zigzagMultiplier * trendFactor * randomVariation)

    thisWeekData.push({
      day: days[i],
      revenue: projectedValue,
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
          <CardDescription>7-days projection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const pastWeekAverage = safeNumber(forecast?.pastWeekAverage) || 0
  const weeklyGoal = safeNumber(forecast?.weeklyGoal) || 50

  const weeklySalesData = generateWeeklySalesData(pastWeekAverage)
  const totalProjectedWeek = weeklySalesData.reduce((sum, day) => sum + day.revenue, 0)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Sales Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">UP</span>
          </div>
        </div>
        <CardDescription>7-days projection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">{formatCurrency(totalProjectedWeek)}</span>
            <span className="text-sm font-medium text-zinc-400">goal</span>
          </div>
          <p className="text-sm text-zinc-400">Based on last week's {formatCurrency(pastWeekAverage)} performance</p>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklySalesData} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#71717a" }}
                className="text-zinc-400"
              />
              <YAxis hide />
              <Line type="linear" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Weekly Goal</span>
            <span className="text-zinc-200">{formatCurrency(weeklyGoal)}</span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, (totalProjectedWeek / weeklyGoal) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>-3% of weekly goal achieved</span>
            <span>success</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
