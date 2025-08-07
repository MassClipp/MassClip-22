"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle, Bug, Info, Loader2, ExternalLink, Globe, Shield, ArrowRight, Zap, Lock, BarChart3 } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

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
    conversionRate: number
  }
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
    currentlyDue: string[]
    pastDue: string[]
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: any[]
  error?: string
  isDemo?: boolean
  message?: string
  stripeAccountId?: string
  lastUpdated?: string
  debug?: any
  demoData?: any
}

export default function EarningsContent() {
  const [user, loading, error] = useAuthState(auth)
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  const fetchEarningsData = async (forceRefresh = false) => {
    if (!user?.uid) return

    try {
      if (forceRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setFetchError(null)

      console.log("🔍 Fetching earnings data...")
      const idToken = await user.getIdToken()
      
      const response = await fetch("/api/dashboard/earnings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        cache: forceRefresh ? 'no-cache' : 'default',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("📊 Earnings data received:", data)
      setEarningsData(data)
    } catch (error) {
      console.error("❌ Error fetching earnings:", error)
      setFetchError(error instanceof Error ? error.message : "Failed to fetch earnings data")
      
      // Set fallback data
      setEarningsData({
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
          conversionRate: 0,
        },
        accountStatus: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          requirementsCount: 0,
          currentlyDue: [],
          pastDue: [],
        },
        recentTransactions: [],
        payoutHistory: [],
        monthlyBreakdown: [],
        error: error instanceof Error ? error.message : "Unknown error",
        isDemo: true,
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchEarningsData()
    }
  }, [user])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">Loading earnings data...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!earningsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">No earnings data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const monthlyChange = calculatePercentageChange(earningsData.thisMonthEarnings, earningsData.lastMonthEarnings)
  const isConnected = earningsData.accountStatus.chargesEnabled && earningsData.accountStatus.detailsSubmitted

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Earnings</h1>
            {!isConnected && (
              <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/50">
                Not Connected
              </Badge>
            )}
            {earningsData.isDemo && (
              <Badge variant="outline" className="border-yellow-600/50 text-yellow-400">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-gray-400">Financial overview and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button
            onClick={() => fetchEarningsData(true)}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {fetchError && (
        <Card className="mb-6 border-red-600/50 bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {fetchError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      {showDebug && earningsData.debug && (
        <Card className="mb-6 border-gray-600 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">API Response</h4>
                <pre className="text-xs text-gray-400 bg-gray-900 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(earningsData.debug, null, 2)}
                </pre>
              </div>
              {earningsData.lastUpdated && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Last Updated</h4>
                  <p className="text-sm text-gray-400">{formatDateTime(earningsData.lastUpdated)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Earnings</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(earningsData.totalEarnings)}</p>
                <p className="text-xs text-gray-500">All-time revenue</p>
              </div>
              <div className="h-12 w-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(earningsData.thisMonthEarnings)}</p>
                <p className="text-xs text-green-400">{formatPercentage(monthlyChange)} from last month</p>
              </div>
              <div className="h-12 w-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(earningsData.availableBalance)}</p>
                <p className="text-xs text-gray-500">Ready for payout</p>
              </div>
              <div className="h-12 w-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-white">{formatNumber(earningsData.salesMetrics.totalSales)}</p>
                <p className="text-xs text-gray-500">{formatCurrency(earningsData.salesMetrics.averageTransactionValue)} avg order</p>
              </div>
              <div className="h-12 w-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-gray-700">Transactions</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Performance */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Performance</CardTitle>
                <CardDescription className="text-gray-400">Your earnings breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Last 30 Days</span>
                  <span className="text-white font-medium">{formatCurrency(earningsData.last30DaysEarnings)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">This Month Sales</span>
                  <span className="text-white font-medium">{formatNumber(earningsData.salesMetrics.thisMonthSales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Last 30 Days Sales</span>
                  <span className="text-white font-medium">{formatNumber(earningsData.salesMetrics.last30DaysSales)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payout Information */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Payout Information</CardTitle>
                <CardDescription className="text-gray-400">Balance and payout status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Pending Payout</span>
                  <span className="text-white font-medium">{formatCurrency(earningsData.pendingPayout)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Available Balance</span>
                  <span className="text-green-400 font-medium">{formatCurrency(earningsData.availableBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Account Status</span>
                  {isConnected ? (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/50">
                      <XCircle className="h-3 w-3 mr-1" />
                      Setup Required
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
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
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
              <CardDescription className="text-gray-400">Latest payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {earningsData.recentTransactions.map((transaction, index) => (
                    <div key={transaction.id || index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-400">{formatDateTime(transaction.created)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(transaction.net)}</p>
                        <p className="text-sm text-gray-400">Fee: {formatCurrency(transaction.fee)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Monthly Breakdown</CardTitle>
              <CardDescription className="text-gray-400">Earnings over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsData.monthlyBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {earningsData.monthlyBreakdown.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{month.month}</p>
                        <p className="text-sm text-gray-400">{formatNumber(month.transactionCount)} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(month.earnings)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No analytics data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Last updated: {earningsData.lastUpdated ? formatDateTime(earningsData.lastUpdated) : 'Never'}
        </p>
      </div>
    </div>
  )
}
