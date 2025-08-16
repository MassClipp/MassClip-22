"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface ApiTestResult {
  endpoint: string
  status: "loading" | "success" | "error" | "idle"
  data?: any
  error?: string
  responseTime?: number
}

export default function ApiTestPage() {
  const [results, setResults] = useState<ApiTestResult[]>([
    { endpoint: "/api/dashboard/enhanced-stats", status: "idle" },
    { endpoint: "/api/dashboard/sales-forecast", status: "idle" },
    { endpoint: "/api/dashboard/earnings", status: "idle" },
  ])

  const updateResult = (endpoint: string, update: Partial<ApiTestResult>) => {
    setResults((prev) => prev.map((result) => (result.endpoint === endpoint ? { ...result, ...update } : result)))
  }

  const testApi = async (endpoint: string) => {
    const startTime = Date.now()
    updateResult(endpoint, { status: "loading" })

    try {
      // Get auth token from localStorage (assuming it's stored there)
      const token = localStorage.getItem("authToken")

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      updateResult(endpoint, {
        status: "success",
        data,
        responseTime,
        error: undefined,
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      updateResult(endpoint, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        data: undefined,
      })
    }
  }

  const testAllApis = async () => {
    for (const result of results) {
      await testApi(result.endpoint)
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "loading":
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      loading: "default",
      success: "default",
      error: "destructive",
      idle: "secondary",
    } as const

    const colors = {
      loading: "bg-blue-500",
      success: "bg-green-500",
      error: "bg-red-500",
      idle: "bg-gray-500",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Test Dashboard</h1>
        <p className="text-muted-foreground">
          Test the earnings API and dashboard analytics endpoints to verify they're working correctly.
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={testAllApis} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Test All APIs
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setResults((prev) => prev.map((r) => ({ ...r, status: "idle", data: undefined, error: undefined })))
          }
        >
          Clear Results
        </Button>
      </div>

      <div className="grid gap-6">
        {results.map((result) => (
          <Card key={result.endpoint} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <CardTitle className="text-lg">{result.endpoint}</CardTitle>
                    <CardDescription>
                      {result.endpoint === "/api/dashboard/enhanced-stats" &&
                        "Enhanced dashboard statistics including sales, videos, and profile views"}
                      {result.endpoint === "/api/dashboard/sales-forecast" &&
                        "Weekly sales forecast with trend analysis"}
                      {result.endpoint === "/api/dashboard/earnings" &&
                        "Comprehensive earnings data with platform fees and Stripe balance"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.responseTime && (
                    <span className="text-sm text-muted-foreground">{result.responseTime}ms</span>
                  )}
                  {getStatusBadge(result.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testApi(result.endpoint)}
                    disabled={result.status === "loading"}
                  >
                    Test
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {result.error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Error</h4>
                  <p className="text-red-700 text-sm font-mono">{result.error}</p>
                </div>
              )}

              {result.data && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-800">Response Data</h4>

                  {/* Enhanced Stats Data */}
                  {result.endpoint === "/api/dashboard/enhanced-stats" && result.data.data && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-800">Sales</h5>
                        <p className="text-sm">
                          Last 30 Days: {result.data.data.sales?.totalSalesLast30Days || 0} sales
                        </p>
                        <p className="text-sm">
                          Revenue: ${result.data.data.sales?.totalRevenueLast30Days?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-sm">This Month: {result.data.data.sales?.thisMonthSales || 0} sales</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h5 className="font-medium text-green-800">Videos</h5>
                        <p className="text-sm">Total Uploads: {result.data.data.videos?.totalUploads || 0}</p>
                        <p className="text-sm">Free Videos: {result.data.data.videos?.totalFreeVideos || 0}</p>
                        <p className="text-sm">
                          Free %: {result.data.data.videos?.freeVideoPercentage?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <h5 className="font-medium text-purple-800">Profile</h5>
                        <p className="text-sm">Views: {result.data.data.profile?.profileViews || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Sales Forecast Data */}
                  {result.endpoint === "/api/dashboard/sales-forecast" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <h5 className="font-medium text-orange-800">Weekly Forecast</h5>
                        <p className="text-sm">Past Week: ${result.data.pastWeekAverage?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">
                          Projected Next Week: ${result.data.projectedNextWeek?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-sm">Weekly Goal: ${result.data.weeklyGoal?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">Trend: {result.data.trendDirection || "stable"}</p>
                      </div>
                      <div className="p-3 bg-teal-50 rounded-lg">
                        <h5 className="font-medium text-teal-800">Daily Metrics</h5>
                        <p className="text-sm">
                          Daily Average: ${result.data.dailyAverageRevenue?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-sm">
                          Projected Daily: ${result.data.projectedDailyRevenue?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-sm">Confidence: {result.data.confidenceLevel || "low"}</p>
                      </div>
                    </div>
                  )}

                  {/* Earnings Data */}
                  {result.endpoint === "/api/dashboard/earnings" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <h5 className="font-medium text-emerald-800">Net Earnings</h5>
                        <p className="text-sm">Total: ${result.data.totalEarnings?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">This Month: ${result.data.thisMonth?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">Last 30 Days: ${result.data.last30Days?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-800">Gross Sales</h5>
                        <p className="text-sm">Total: ${result.data.grossSales?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">This Month: ${result.data.thisMonthGross?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">Platform Fees: ${result.data.totalPlatformFees?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-lg">
                        <h5 className="font-medium text-indigo-800">Stripe Balance</h5>
                        <p className="text-sm">Available: ${result.data.availableBalance?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">Pending: ${result.data.pendingPayout?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm">Status: {result.data.accountStatus || "Unknown"}</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <details className="cursor-pointer">
                    <summary className="font-medium text-sm text-muted-foreground hover:text-foreground">
                      View Raw JSON Response
                    </summary>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {result.status === "idle" && (
                <p className="text-muted-foreground text-sm">Click "Test" to check this API endpoint</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Make sure you're logged in and have a valid auth token</li>
          <li>• Some APIs require a connected Stripe account to return meaningful data</li>
          <li>• The sales forecast API needs historical sales data to generate predictions</li>
          <li>• Response times may vary based on data complexity and Stripe API calls</li>
        </ul>
      </div>
    </div>
  )
}
