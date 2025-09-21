"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

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
  return `$${safeAmount.toFixed(2)}`
}

export function SalesForecastCard() {
  const { forecast, loading, error } = useSalesForecast()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-white">Revenue Forecast</CardTitle>
          </div>
          <CardDescription>Next 7 days based on recent performance</CardDescription>
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
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-white">Revenue Forecast</CardTitle>
            </div>
          </div>
          <CardDescription>Next 7 days based on recent performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-white mb-2">No Forecast Data</h3>
              <p className="text-zinc-400">Connect Stripe to see revenue projections</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  let chartData = []
  if (Array.isArray(forecast.chartData) && forecast.chartData.length > 0) {
    chartData = forecast.chartData.slice(-14).map((item, index) => ({
      date: item.date,
      revenue: safeNumber(item.revenue),
      isProjected: item.isProjected || index >= 7,
    }))
  } else {
    // Create simple 14-day data structure
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      chartData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        isProjected: false,
      })
    }
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      chartData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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

  const getTrendIcon = () => {
    if (projectedWeekRevenue > pastWeekRevenue) return <TrendingUp className="h-4 w-4 text-green-400" />
    if (projectedWeekRevenue < pastWeekRevenue) return <TrendingDown className="h-4 w-4 text-red-400" />
    return <Minus className="h-4 w-4 text-yellow-400" />
  }

  const getTrendStatus = () => {
    if (projectedWeekRevenue > pastWeekRevenue) return "GROWING"
    if (projectedWeekRevenue < pastWeekRevenue) return "DECLINING"
    return "STABLE"
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-white">Revenue Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="text-xs font-medium text-yellow-400">{getTrendStatus()}</span>
          </div>
        </div>
        <div className="space-y-2">
          <CardDescription>Next 7 days based on recent performance</CardDescription>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">Past week: {formatCurrency(pastWeekRevenue)}</span>
            <span className="text-zinc-400">Projected: {formatCurrency(projectedWeekRevenue)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full">
          <AreaChart
            width={1200}
            height={320}
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
              <filter id="forecastShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.3" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.2} />
            <XAxis
              dataKey="date"
              stroke="#ffffff"
              fontSize={12}
              tickLine={{ stroke: "#ffffff" }}
              axisLine={{ stroke: "#ffffff" }}
            />
            <YAxis
              stroke="#ffffff"
              fontSize={12}
              tickLine={{ stroke: "#ffffff" }}
              axisLine={{ stroke: "#ffffff" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
              }}
              formatter={(value: any, name: string) => [formatCurrency(value), "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#ffffff"
              strokeWidth={3}
              fill="url(#forecastGradient)"
              name="revenue"
              filter="url(#forecastShadow)"
              dot={{ fill: "#ffffff", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#ffffff", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </div>
      </CardContent>
    </Card>
  )
}
