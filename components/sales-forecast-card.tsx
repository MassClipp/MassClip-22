"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts"

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

function generateWeeklySalesData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const baseValues = [15, 45, 25, 60, 35, 75, 50] // Pronounced zig-zag pattern

  return days.map((day, index) => ({
    day,
    revenue: baseValues[index],
  }))
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

  const weeklySalesData = generateWeeklySalesData()
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
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">{formatCurrency(totalProjectedWeek)}</span>
            <span className="text-sm font-medium text-zinc-400">projected</span>
          </div>
          <p className="text-sm text-zinc-400">Based on last week's {formatCurrency(pastWeekAverage)} performance</p>
        </div>

        <div className="w-full h-48 bg-zinc-800/20 rounded-lg border border-zinc-700/30 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklySalesData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="day"
                axisLine={true}
                tickLine={true}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                stroke="#6b7280"
              />
              <YAxis
                axisLine={true}
                tickLine={true}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${value}`}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, fill: "#60a5fa", stroke: "#1d4ed8", strokeWidth: 2 }}
              />
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
            <span>{Math.round((totalProjectedWeek / weeklyGoal) * 100)}% of weekly goal projected</span>
            <span>trending up</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
