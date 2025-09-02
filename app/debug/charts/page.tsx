"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
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
  const [chartStatus, setChartStatus] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current += 1
    const timestamp = new Date().toLocaleTimeString()
    const newStatus = `${timestamp} - Component mounted (render #${renderCount.current})`
    console.log("[v0] 📊", newStatus)
    setChartStatus((prev) => [...prev, newStatus])

    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        console.log("[v0] 📐 Container dimensions:", {
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0,
        })
      }
    }

    checkDimensions()
    const interval = setInterval(checkDimensions, 1000)

    return () => {
      clearInterval(interval)
      console.log("[v0] 🔄 Component unmounting")
    }
  }, [])

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
    console.log("Render count:", renderCount.current)
    setShowLogs(true)
  }

  const onChartRender = (chartType: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const status = `${timestamp} - ${chartType} rendered successfully`
    console.log("[v0] ✅", status)
    setChartStatus((prev) => [...prev, status])
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Charts Debug Page</h1>
            <p className="text-white/70 mt-1">Testing chart rendering components (Render #{renderCount.current})</p>
          </div>
          <Button onClick={logChartData} variant="outline" className="border-zinc-700 text-white bg-transparent">
            Log Chart Data
          </Button>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Live Chart Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white/70 text-sm space-y-1 max-h-32 overflow-y-auto">
              {chartStatus.map((status, i) => (
                <p key={i} className="font-mono text-xs">
                  {status}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

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

        {/* Test Area Chart with Error Boundary */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Test Area Chart (Revenue Trend)</CardTitle>
            <p className="text-white/70">Testing the same chart as earnings page</p>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary>
              <div ref={containerRef} className="h-80 w-full border border-zinc-700 rounded">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  onResize={(width, height) => {
                    console.log("[v0] 📐 ResponsiveContainer resized:", { width, height })
                  }}
                >
                  <AreaChart
                    data={testRevenueData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    onMouseEnter={() => onChartRender("AreaChart")}
                  >
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
                    <XAxis
                      dataKey="month"
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
                      name="revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      fill="url(#testProfitGradient)"
                      name="profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        {/* Test Bar Chart with Error Boundary */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Test Bar Chart (Weekly Performance)</CardTitle>
            <p className="text-white/70">Testing the same chart as earnings page</p>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary>
              <div className="h-64 w-full border border-zinc-700 rounded">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={testSalesData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    onMouseEnter={() => onChartRender("BarChart")}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3} />
                    <XAxis
                      dataKey="day"
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
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: any, name: string) => [value, name === "sales" ? "Sales" : "Revenue"]}
                    />
                    <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="sales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        {/* Simple fallback chart test with Error Boundary */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Fallback Chart Test</CardTitle>
            <p className="text-white/70">Simple chart without gradients</p>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary>
              <div className="h-48 w-full border border-zinc-700 rounded">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={testSalesData} onMouseEnter={() => onChartRender("Fallback BarChart")}>
                    <XAxis dataKey="day" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <Bar dataKey="sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-white/70">
            Navigate to <code className="bg-zinc-800 px-2 py-1 rounded text-white">/debug/charts</code> to test charts
          </p>
        </div>
      </div>
    </div>
  )
}
