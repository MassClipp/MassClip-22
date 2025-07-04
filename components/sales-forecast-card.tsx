"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesForecast } from "@/hooks/use-sales-forecast"
import { TrendingUp, TrendingDown, Minus, Target, Zap, Activity } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts"

export function SalesForecastCard() {
  const { forecast, loading, error } = useSalesForecast()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Financial Forecast</CardTitle>
          </div>
          <CardDescription>Next 30 days projection</CardDescription>
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
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Financial Forecast</CardTitle>
          </div>
          <CardDescription>Unable to generate forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">{error || "No data available"}</p>
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

  // Prepare chart data - show last 15 days + next 15 days for better visualization
  const chartData = forecast.chartData.slice(-45).filter((_, index) => index % 2 === 0) // Every other day for cleaner chart

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-zinc-200">Financial Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>{forecast.trendDirection.toUpperCase()}</span>
          </div>
        </div>
        <CardDescription>Next 30 days projection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projected Earnings */}
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">${forecast.projectedNext30Days.toFixed(2)}</span>
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>{forecast.confidenceLevel} confidence</span>
          </div>
          <p className="text-sm text-zinc-400">Based on ${forecast.dailyAverageRevenue.toFixed(2)}/day average</p>
        </div>

        {/* Motivational Message */}
        <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-200 leading-relaxed">{forecast.motivationalMessage}</p>
          </div>
        </div>

        {/* Mini Chart */}
        {chartData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Past Performance</span>
              <span>Projected</span>
            </div>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <ReferenceLine
                    x={chartData[Math.floor(chartData.length / 2)]?.date}
                    stroke="#71717a"
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray={(entry: any) => (entry?.isProjected ? "3 3" : "0")}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span>Historical</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-0.5 bg-green-500 opacity-60"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to right, transparent, transparent 2px, #10b981 2px, #10b981 4px)",
                  }}
                ></div>
                <span>Forecast</span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/50">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">${forecast.past30DaysAverage.toFixed(2)}</p>
            <p className="text-xs text-zinc-400">Last 30 Days</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-200">${forecast.projectedDailyRevenue.toFixed(2)}</p>
            <p className="text-xs text-zinc-400">Projected Daily</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-1 pt-2">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500">Live forecast</span>
        </div>
      </CardContent>
    </Card>
  )
}
