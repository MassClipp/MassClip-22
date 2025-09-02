"use client"

import React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts"

class ChartErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    console.log("[v0] 🚨 Chart Error Boundary caught error:", error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.log("[v0] 🚨 Chart Error Details:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded text-red-400">
          <p>Chart Error: {this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ChartsDebugPage() {
  const [showLogs, setShowLogs] = useState(false)

  // Simple test data
  const testRevenueData = [
    { month: "Jul", revenue: 100, profit: 80 },
    { month: "Aug", revenue: 150, profit: 120 },
    { month: "Sep", revenue: 200, profit: 160 },
    { month: "Oct", revenue: 180, profit: 140 },
    { month: "Nov", revenue: 250, profit: 200 },
    { month: "Dec", revenue: 300, profit: 240 },
  ]

  const testSalesData = [
    { day: "Mon", sales: 5, revenue: 50 },
    { day: "Tue", sales: 8, revenue: 80 },
    { day: "Wed", sales: 12, revenue: 120 },
    { day: "Thu", sales: 6, revenue: 60 },
    { day: "Fri", sales: 15, revenue: 150 },
    { day: "Sat", sales: 20, revenue: 200 },
    { day: "Sun", sales: 10, revenue: 100 },
  ]

  const logChartData = () => {
    console.log("[v0] 🔍 CHART DEBUG DATA:")
    console.log("Revenue Data:", testRevenueData)
    console.log("Sales Data:", testSalesData)
    console.log("ResponsiveContainer available:", !!ResponsiveContainer)
    console.log("AreaChart available:", !!AreaChart)
    console.log("BarChart available:", !!BarChart)
    setShowLogs(true)
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Charts Debug Page</h1>
            <p className="text-white/70 mt-1">Testing chart rendering components</p>
          </div>
          <Button onClick={logChartData} variant="outline" className="border-zinc-700 text-white bg-transparent">
            Log Chart Data
          </Button>
        </div>

        {showLogs && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-white/70 text-sm space-y-2">
                <p>✅ ResponsiveContainer: {ResponsiveContainer ? "Available" : "Missing"}</p>
                <p>✅ AreaChart: {AreaChart ? "Available" : "Missing"}</p>
                <p>✅ BarChart: {BarChart ? "Available" : "Missing"}</p>
                <p>
                  ✅ Test Data: {testRevenueData.length} revenue points, {testSalesData.length} sales points
                </p>
                <p className="text-yellow-400">Check browser console for detailed logs</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Test Area Chart (Revenue Trend)</CardTitle>
            <p className="text-white/70">Testing the same chart as earnings page</p>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={testRevenueData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="testRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="testProfitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3} />
                    <XAxis dataKey="month" stroke="#ffffff" fontSize={12} />
                    <YAxis stroke="#ffffff" fontSize={12} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: any, name: string) => [
                        `$${Number(value).toFixed(2)}`,
                        name === "revenue" ? "Revenue" : "Profit",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#testRevenueGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      fill="url(#testProfitGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Test Bar Chart (Weekly Performance)</CardTitle>
            <p className="text-white/70">Testing the same chart as earnings page</p>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={testSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3} />
                    <XAxis dataKey="day" stroke="#ffffff" fontSize={12} />
                    <YAxis stroke="#ffffff" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Simple Chart Test</CardTitle>
            <p className="text-white/70">Minimal chart implementation</p>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={testSalesData}>
                    <XAxis dataKey="day" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <Bar dataKey="sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
