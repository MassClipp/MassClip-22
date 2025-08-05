"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDateTime,
  calculatePercentageChange,
} from "@/lib/format-utils"

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
  stripeAccountId?: string
  lastUpdated?: string
}

export default function EarningsPage() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEarningsData = async (forceRefresh = false) => {
    try {
      setError(null)
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const endpoint = "/api/dashboard/earnings"
      const method = forceRefresh ? "POST" : "GET"

      const response = await fetch(endpoint, { method })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch earnings data")
      }

      setEarningsData(data)
      console.log("Earnings data loaded:", data)
    } catch (err) {
      console.error("Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to load earnings data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEarningsData()
  }, [])

  const handleRefresh = () => {
    fetchEarningsData(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
            <p className="text-muted-foreground">Track your revenue and performance</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && !earningsData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
            <p className="text-muted-foreground">Track your revenue and performance</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
            <Button onClick={() => fetchEarningsData()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = earningsData!
  const monthlyGrowth = calculatePercentageChange(data.thisMonthEarnings, data.lastMonthEarnings)

  // Determine data source badge
  const getDataSourceBadge = () => {
    if (data.error) {
      return <Badge variant="destructive">Error</Badge>
    }
    if (data.isDemo) {
      return <Badge variant="secondary">Demo Data</Badge>
    }
    return <Badge variant="default">Live Data</Badge>
  }

  // Account status badge
  const getAccountStatusBadge = () => {
    const { accountStatus } = data
    if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
      return <Badge variant="destructive">Setup Required</Badge>
    }
    if (accountStatus.requirementsCount > 0) {
      return <Badge variant="secondary">Action Required</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
          <p className="text-muted-foreground">Track your revenue and performance</p>
          <div className="flex items-center gap-2 mt-2">
            {getDataSourceBadge()}
            {data.stripeAccountId && <Badge variant="outline">Account: {data.stripeAccountId.slice(-6)}</Badge>}
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.thisMonthEarnings)}</div>
            <p className="text-xs text-muted-foreground">{formatPercentage(monthlyGrowth)} from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.availableBalance)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.salesMetrics.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.salesMetrics.averageTransactionValue)} avg order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Status Alert */}
      {data.accountStatus.requirementsCount > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Account Setup Required</h3>
                <p className="text-sm text-yellow-700">
                  {data.accountStatus.requirementsCount} requirement(s) need attention to enable full functionality.
                </p>
                {data.accountStatus.currentlyDue.length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Currently due: {data.accountStatus.currentlyDue.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Last 30 Days</span>
                  <span className="font-semibold">{formatCurrency(data.last30DaysEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>This Month Sales</span>
                  <span className="font-semibold">{formatNumber(data.salesMetrics.thisMonthSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last 30 Days Sales</span>
                  <span className="font-semibold">{formatNumber(data.salesMetrics.last30DaysSales)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Pending Payout</span>
                  <span className="font-semibold">{formatCurrency(data.pendingPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Balance</span>
                  <span className="font-semibold text-green-600">{formatCurrency(data.availableBalance)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>Account Status</span>
                  {getAccountStatusBadge()}
                </div>
                <Button className="w-full bg-transparent" variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Payouts
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {data.recentTransactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(transaction.created)} • {transaction.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(transaction.net)}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.status === "available" ? (
                            <CheckCircle className="inline h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <AlertCircle className="inline h-3 w-3 text-yellow-500 mr-1" />
                          )}
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No transactions found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Health</CardTitle>
              <CardDescription>Your Stripe account status and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <span>Charges Enabled</span>
                  {data.accountStatus.chargesEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Payouts Enabled</span>
                  {data.accountStatus.payoutsEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Details Submitted</span>
                  {data.accountStatus.detailsSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Requirements</span>
                  <Badge variant={data.accountStatus.requirementsCount > 0 ? "destructive" : "default"}>
                    {data.accountStatus.requirementsCount} pending
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      {data.lastUpdated && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Last updated: {formatDateTime(data.lastUpdated)}
        </div>
      )}
    </div>
  )
}
