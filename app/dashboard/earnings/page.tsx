"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  safeNumber,
  validateEarningsData,
  createDefaultEarningsData,
} from "@/lib/format-utils"
import { DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, Clock } from "lucide-react"

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
  }
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: any[]
}

export default function EarningsPage() {
  const [earningsData, setEarningsData] = useState<EarningsData>(createDefaultEarningsData())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEarningsData = async () => {
    try {
      console.log("🔍 Fetching earnings data...")
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard/earnings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      })

      console.log("📡 Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch earnings data`)
      }

      const data = await response.json()
      console.log("📊 Raw earnings data received:", data)

      // Validate and sanitize the data
      const validatedData = validateEarningsData(data)
      console.log("✅ Validated earnings data:", validatedData)

      setEarningsData(validatedData)
    } catch (err) {
      console.error("❌ Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to load earnings data")

      // Set safe default data on error
      setEarningsData(createDefaultEarningsData())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarningsData()
  }, [])

  // Calculate growth percentage safely
  const calculateGrowth = (current: number, previous: number): number => {
    const safeCurrent = safeNumber(current, 0)
    const safePrevious = safeNumber(previous, 0)

    if (safePrevious === 0) return safeCurrent > 0 ? 100 : 0
    return ((safeCurrent - safePrevious) / safePrevious) * 100
  }

  const monthlyGrowth = calculateGrowth(earningsData.thisMonthEarnings, earningsData.lastMonthEarnings)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading earnings data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
          <p className="text-gray-600">Track your revenue and performance</p>
        </div>
        <Button onClick={fetchEarningsData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {earningsData.accountStatus.chargesEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Charges Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              {earningsData.accountStatus.payoutsEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Payouts Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              {earningsData.accountStatus.detailsSubmitted ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Details Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={earningsData.accountStatus.requirementsCount === 0 ? "default" : "destructive"}>
                {formatNumber(earningsData.accountStatus.requirementsCount)} Requirements
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Earnings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.thisMonthEarnings)}</div>
            <p className="text-xs text-muted-foreground">{formatPercentage(monthlyGrowth)} from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.availableBalance)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(earningsData.salesMetrics.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(earningsData.salesMetrics.averageTransactionValue)} avg order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last 30 Days</span>
                  <span className="font-bold">{formatCurrency(earningsData.last30DaysEarnings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">This Month Sales</span>
                  <span className="font-bold">{formatNumber(earningsData.salesMetrics.thisMonthSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last 30 Days Sales</span>
                  <span className="font-bold">{formatNumber(earningsData.salesMetrics.last30DaysSales)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Payout</span>
                  <span className="font-bold">{formatCurrency(earningsData.pendingPayout)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Available Balance</span>
                  <span className="font-bold text-green-600">{formatCurrency(earningsData.availableBalance)}</span>
                </div>
                <Progress value={earningsData.availableBalance > 0 ? 100 : 0} className="w-full" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {earningsData.recentTransactions && earningsData.recentTransactions.length > 0 ? (
                <div className="space-y-2">
                  {earningsData.recentTransactions.map((transaction, index) => (
                    <div
                      key={transaction.id || index}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{transaction.description || "Transaction"}</p>
                        <p className="text-sm text-gray-600">
                          {transaction.created ? new Date(transaction.created).toLocaleDateString() : "No date"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(transaction.amount)}</p>
                        <Badge variant="outline">{transaction.status || "completed"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent transactions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {earningsData.monthlyBreakdown && earningsData.monthlyBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {earningsData.monthlyBreakdown.map((month, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <span className="font-medium">{month.month}</span>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(month.earnings)}</p>
                        <p className="text-sm text-gray-600">{formatNumber(month.transactionCount)} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No monthly data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
