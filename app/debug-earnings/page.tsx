"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatNumber, safeNumber } from "@/lib/format-utils"

interface EarningsData {
  totalEarnings: number
  pendingEarnings: number
  availableEarnings: number
  totalSales: number
  monthlyEarnings: number
  weeklyEarnings: number
  conversionRate: number
  averageOrderValue: number
  recentTransactions: any[]
  earningsHistory: any[]
  lastUpdated: string
  debug: {
    dataSource: string
    timestamp: string
    hasStripeData: boolean
    hasFirestoreData: boolean
  }
}

export default function DebugEarningsPage() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)

  const fetchEarningsData = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔍 Fetching earnings data...")

      const response = await fetch("/api/dashboard/earnings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("📊 Raw response data:", data)

      setRawResponse(data)
      setEarningsData(data)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || "Unknown error"}`)
      }

      console.log("✅ Earnings data loaded successfully")
    } catch (err) {
      console.error("❌ Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarningsData()
  }, [])

  const testFormatting = () => {
    console.log("🧪 Testing formatting functions...")

    const testValues = [
      null,
      undefined,
      "",
      "invalid",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      0,
      123.456,
      "789.123",
      { amount: 100 },
      [1, 2, 3],
    ]

    testValues.forEach((value, index) => {
      console.log(`Test ${index + 1}:`, {
        input: value,
        safeNumber: safeNumber(value),
        formatCurrency: formatCurrency(value),
        formatNumber: formatNumber(value, 2),
      })
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug Earnings Page</h1>
        <div className="flex gap-2">
          <Button onClick={fetchEarningsData} disabled={loading}>
            {loading ? "Loading..." : "Refresh Data"}
          </Button>
          <Button onClick={testFormatting} variant="outline">
            Test Formatting
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {earningsData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Data Source</p>
                  <Badge variant="outline">{earningsData.debug?.dataSource || "unknown"}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-gray-600">{earningsData.lastUpdated || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Has Stripe Data</p>
                  <Badge variant={earningsData.debug?.hasStripeData ? "default" : "secondary"}>
                    {earningsData.debug?.hasStripeData ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Has Firestore Data</p>
                  <Badge variant={earningsData.debug?.hasFirestoreData ? "default" : "secondary"}>
                    {earningsData.debug?.hasFirestoreData ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(earningsData.totalEarnings)}</p>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.totalEarnings}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(earningsData.pendingEarnings)}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.pendingEarnings}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(earningsData.availableEarnings)}</p>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.availableEarnings}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(earningsData.totalSales)}</p>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.totalSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold">{formatCurrency(earningsData.monthlyEarnings)}</p>
                  <p className="text-sm text-gray-600">Monthly Earnings</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.monthlyEarnings}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatCurrency(earningsData.weeklyEarnings)}</p>
                  <p className="text-sm text-gray-600">Weekly Earnings</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.weeklyEarnings}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNumber(earningsData.conversionRate, 1)}%</p>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.conversionRate}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatCurrency(earningsData.averageOrderValue)}</p>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                  <p className="text-xs text-gray-500">Raw: {earningsData.averageOrderValue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {earningsData.recentTransactions && earningsData.recentTransactions.length > 0 ? (
                <div className="space-y-2">
                  {earningsData.recentTransactions.map((transaction, index) => (
                    <div key={transaction.id || index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{transaction.description || "Unknown Transaction"}</p>
                        <p className="text-sm text-gray-600">{transaction.date || "No date"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(transaction.amount)}</p>
                        <Badge variant="outline">{transaction.status || "unknown"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent transactions</p>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Raw API Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p>Loading earnings data...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
