"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle, Bug, Info, Loader2, ExternalLink, Globe, Shield, ArrowRight, Zap, Lock, BarChart3 } from 'lucide-react'
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import EarningsDebugPanel from "@/components/earnings-debug-panel"

// Safe formatting functions
function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatNumber(value: number): string {
  if (typeof value !== "number" || isNaN(value)) return "0"
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercentage(value: number): string {
  if (typeof value !== "number" || isNaN(value)) return "0%"
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function formatDateTime(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return "Invalid Date"
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "Invalid Date"
  }
}

function calculatePercentageChange(current: number, previous: number): number {
  if (typeof current !== "number" || typeof previous !== "number") return 0
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export default function EarningsContent() {
  const { data: earningsData, loading, error, refresh } = useStripeEarnings()
  const [debugMode, setDebugMode] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">Loading earnings data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-gray-800 border-red-600/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-4">Failed to load earnings data</p>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <Button onClick={refresh} variant="outline" className="border-red-600/50 text-red-400">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = earningsData || {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    last30DaysEarnings: 0,
    pendingPayout: 0,
    availableBalance: 0,
    salesMetrics: {
      totalSales: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      averageTransactionValue: 0,
      conversionRate: 0
    },
    accountStatus: {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
      currentlyDue: [],
      pastDue: []
    },
    recentTransactions: [],
    payoutHistory: [],
    monthlyBreakdown: []
  }

  const monthlyChange = calculatePercentageChange(data.thisMonthEarnings, data.lastMonthEarnings)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Earnings
            {!data.accountStatus.chargesEnabled && (
              <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/50">
                Not Connected
              </Badge>
            )}
            {data.isDemo && (
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-600/50">
                Demo Data
              </Badge>
            )}
          </h1>
          <p className="text-gray-400">Financial overview and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
            className="border-gray-600 text-gray-400 hover:bg-gray-700"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="border-gray-600 text-gray-400 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Earnings</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.totalEarnings)}</p>
                <p className="text-xs text-gray-500">All-time revenue</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.thisMonthEarnings)}</p>
                <p className={`text-xs ${monthlyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(monthlyChange)} from last month
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.availableBalance)}</p>
                <p className="text-xs text-gray-500">Ready for payout</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-white">{formatNumber(data.salesMetrics.totalSales)}</p>
                <p className="text-xs text-gray-500">{formatCurrency(data.salesMetrics.averageTransactionValue)} avg order</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-gray-700">Transactions</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Performance */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Performance</CardTitle>
                <CardDescription>Your earnings breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last 30 Days</span>
                  <span className="text-white font-semibold">{formatCurrency(data.last30DaysEarnings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">This Month Sales</span>
                  <span className="text-white font-semibold">{formatNumber(data.salesMetrics.thisMonthSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last 30 Days Sales</span>
                  <span className="text-white font-semibold">{formatNumber(data.salesMetrics.last30DaysSales)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payout Information */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Payout Information</CardTitle>
                <CardDescription>Balance and payout status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Pending Payout</span>
                  <span className="text-white font-semibold">{formatCurrency(data.pendingPayout)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Available Balance</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(data.availableBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Account Status</span>
                  <Badge 
                    variant={data.accountStatus.chargesEnabled ? "default" : "destructive"}
                    className={data.accountStatus.chargesEnabled ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-red-600/20 text-red-400 border-red-600/50"}
                  >
                    {data.accountStatus.chargesEnabled ? "Active" : "Setup Required"}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full border-gray-600 text-gray-400 hover:bg-gray-700"
                  onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
              <CardDescription>Latest payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {data.recentTransactions.map((transaction: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{transaction.description || 'Payment'}</p>
                        <p className="text-gray-400 text-sm">{formatDateTime(transaction.created)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatCurrency(transaction.amount / 100)}</p>
                        <Badge 
                          variant={transaction.status === 'succeeded' ? "default" : "secondary"}
                          className={transaction.status === 'succeeded' ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400"}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No transactions yet</p>
                  <p className="text-gray-500 text-sm">Transactions will appear here once you start receiving payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Sales Metrics</CardTitle>
                <CardDescription>Performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Transaction</span>
                  <span className="text-white font-semibold">{formatCurrency(data.salesMetrics.averageTransactionValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Conversion Rate</span>
                  <span className="text-white font-semibold">{data.salesMetrics.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Sales Count</span>
                  <span className="text-white font-semibold">{formatNumber(data.salesMetrics.totalSales)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Health</CardTitle>
                <CardDescription>Stripe account status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Charges Enabled</span>
                  {data.accountStatus.chargesEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Payouts Enabled</span>
                  {data.accountStatus.payoutsEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Details Submitted</span>
                  {data.accountStatus.detailsSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                {data.accountStatus.requirementsCount > 0 && (
                  <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      {data.accountStatus.requirementsCount} requirement(s) need attention
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Debug Information */}
      {debugMode && (
        <EarningsDebugPanel 
          earningsData={data}
          loading={loading}
          error={error}
        />
      )}

      {/* Footer */}
      {data.lastUpdated && (
        <div className="text-center text-gray-500 text-sm">
          Last updated: {formatDateTime(data.lastUpdated)}
        </div>
      )}
    </div>
  )
}
