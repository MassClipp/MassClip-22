"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle, Bug, Info, Loader2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { StripeConnectionSetup } from "@/components/stripe-connection-setup"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

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

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
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

export default function EarningsPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus | null>(null)
  const [checkingStripe, setCheckingStripe] = useState(true)
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  // Check Stripe connection status
  const checkStripeStatus = async () => {
    if (!user?.uid) return

    try {
      setCheckingStripe(true)
      console.log("🔍 Checking Stripe connection status...")

      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 Stripe status:", data)
        setStripeStatus(data)
        
        // Only fetch earnings if Stripe is properly connected
        if (data.connected && data.chargesEnabled && data.detailsSubmitted) {
          await fetchEarningsData()
        } else {
          setLoading(false)
        }
      } else {
        console.log("🔍 No Stripe connection found")
        setStripeStatus({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: "not_connected"
        })
        setLoading(false)
      }
    } catch (error) {
      console.error("🔍 Error checking Stripe status:", error)
      setStripeStatus({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "error"
      })
      setLoading(false)
    } finally {
      setCheckingStripe(false)
    }
  }

  const fetchEarningsData = async (forceRefresh = false) => {
    try {
      setError(null)
      setDebugInfo(null)
      
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      console.log("🔍 Fetching earnings data...")

      const endpoint = "/api/dashboard/earnings"
      const method = forceRefresh ? "POST" : "GET"

      console.log(`🔍 Making ${method} request to ${endpoint}`)

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`🔍 Response status: ${response.status}`)
      console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log(`🔍 Raw response:`, responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("🔍 JSON parse error:", parseError)
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`)
      }

      console.log("🔍 Parsed response data:", data)

      // Store debug information
      if (data.debug) {
        setDebugInfo(data.debug)
        console.log("🔍 Debug info received:", data.debug)
      }

      if (!response.ok) {
        console.error("🔍 API Error - Status:", response.status)
        console.error("🔍 API Error - Data:", data)
        
        // If we have demo data in the error response, use it
        if (data.demoData) {
          setEarningsData({
            ...data.demoData,
            isDemo: true,
            error: data.error,
            message: data.message,
            debug: data.debug,
            lastUpdated: data.lastUpdated,
          })
          return
        }
        
        throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`)
      }

      setEarningsData(data)
      console.log("🔍 Earnings data set successfully")
    } catch (err) {
      console.error("🔍 Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to load earnings data")
      
      // Set fallback demo data
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
        isDemo: true,
        error: err instanceof Error ? err.message : "Unknown error",
        lastUpdated: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const handleStripeConnectionSuccess = () => {
    console.log("🎉 Stripe connection successful, refreshing status...")
    checkStripeStatus()
  }

  const handleRefresh = () => {
    if (stripeStatus?.connected && stripeStatus?.chargesEnabled && stripeStatus?.detailsSubmitted) {
      fetchEarningsData(true)
    } else {
      checkStripeStatus()
    }
  }

  // Show loading while checking auth or Stripe status
  if (authLoading || checkingStripe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {authLoading ? "Loading..." : "Checking Stripe connection..."}
          </p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show Stripe connection setup if not connected or not fully set up
  if (!stripeStatus?.connected || !stripeStatus?.chargesEnabled || !stripeStatus?.detailsSubmitted) {
    return <StripeConnectionSetup userId={user.uid} onSuccess={handleStripeConnectionSuccess} />
  }

  // Show loading while fetching earnings data
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

  const data = earningsData!

  // After the data assignment, add safety checks
  const safeData = {
    totalEarnings: data?.totalEarnings || 0,
    thisMonthEarnings: data?.thisMonthEarnings || 0,
    lastMonthEarnings: data?.lastMonthEarnings || 0,
    last30DaysEarnings: data?.last30DaysEarnings || 0,
    pendingPayout: data?.pendingPayout || 0,
    availableBalance: data?.availableBalance || 0,
    salesMetrics: {
      totalSales: data?.salesMetrics?.totalSales || 0,
      thisMonthSales: data?.salesMetrics?.thisMonthSales || 0,
      last30DaysSales: data?.salesMetrics?.last30DaysSales || 0,
      averageTransactionValue: data?.salesMetrics?.averageTransactionValue || 0,
      conversionRate: data?.salesMetrics?.conversionRate || 0,
    },
    accountStatus: {
      chargesEnabled: data?.accountStatus?.chargesEnabled || false,
      payoutsEnabled: data?.accountStatus?.payoutsEnabled || false,
      detailsSubmitted: data?.accountStatus?.detailsSubmitted || false,
      requirementsCount: data?.accountStatus?.requirementsCount || 0,
      currentlyDue: data?.accountStatus?.currentlyDue || [],
      pastDue: data?.accountStatus?.pastDue || [],
    },
    recentTransactions: data?.recentTransactions || [],
    payoutHistory: data?.payoutHistory || [],
    monthlyBreakdown: data?.monthlyBreakdown || [],
    error: data?.error,
    isDemo: data?.isDemo,
    message: data?.message,
    stripeAccountId: data?.stripeAccountId,
    lastUpdated: data?.lastUpdated,
    debug: data?.debug,
  }

  const monthlyGrowth = calculatePercentageChange(safeData.thisMonthEarnings, safeData.lastMonthEarnings)

  // Determine data source badge
  const getDataSourceBadge = () => {
    if (safeData.error) {
      return <Badge variant="destructive">Error</Badge>
    }
    if (safeData.isDemo) {
      return <Badge variant="secondary">Demo Data</Badge>
    }
    return <Badge variant="default">Live Data</Badge>
  }

  // Account status badge
  const getAccountStatusBadge = () => {
    const { accountStatus } = safeData
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
            {safeData.stripeAccountId && <Badge variant="outline">Account: {safeData.stripeAccountId.slice(-6)}</Badge>}
            {safeData.message && <Badge variant="outline">{safeData.message}</Badge>}
            {debugInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="ml-2"
              >
                <Bug className="mr-2 h-4 w-4" />
                Debug Info
              </Button>
            )}
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Debug Information Panel */}
      {debugInfo && showDebug && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {debugInfo.logs && (
                <div>
                  <h4 className="font-semibold mb-2">Execution Log:</h4>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-60 overflow-y-auto">
                    {debugInfo.logs.map((log: any, index: number) => (
                      <div key={index} className="mb-1">
                        <span className="text-blue-600">[{log.step}]</span> {log.action}
                        {log.timestamp && <span className="text-gray-500 ml-2">({new Date(log.timestamp).toLocaleTimeString()})</span>}
                        {log.error && <span className="text-red-600 ml-2">ERROR: {log.error}</span>}
                        {log.data && (
                          <pre className="ml-4 text-xs text-gray-600">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debugInfo.importErrors && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Import Errors:</h4>
                  <div className="bg-red-50 p-3 rounded">
                    {debugInfo.importErrors.map((error: string, index: number) => (
                      <div key={index} className="text-red-700 text-sm">{error}</div>
                    ))}
                  </div>
                </div>
              )}

              {debugInfo.importStatus && (
                <div>
                  <h4 className="font-semibold mb-2">Import Status:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(debugInfo.importStatus).map(([key, status]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className={status === "✅ success" ? "text-green-600" : "text-red-600"}>
                          {status as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debugInfo.errorDetails && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Error Details:</h4>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <div><strong>Name:</strong> {debugInfo.errorDetails.name}</div>
                    <div><strong>Message:</strong> {debugInfo.errorDetails.message}</div>
                    {debugInfo.errorDetails.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Stack Trace</summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                          {debugInfo.errorDetails.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {debugInfo.environment && (
                <div>
                  <h4 className="font-semibold mb-2">Environment:</h4>
                  <div className="text-sm">
                    <div>Node Version: {debugInfo.environment.nodeVersion}</div>
                    <div>Platform: {debugInfo.environment.platform}</div>
                    <div>Timestamp: {debugInfo.environment.timestamp}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
            <Button onClick={() => fetchEarningsData()} className="mt-4" variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeData.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeData.thisMonthEarnings)}</div>
            <p className="text-xs text-muted-foreground">{formatPercentage(monthlyGrowth)} from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeData.availableBalance)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(safeData.salesMetrics.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(safeData.salesMetrics.averageTransactionValue)} avg order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Demo Mode Notice */}
      {safeData.isDemo && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-800">Demo Mode Active</h3>
                <p className="text-sm text-blue-700">
                  This is sample data for demonstration purposes. Connect your Stripe account to see real earnings.
                </p>
                {safeData.error && (
                  <p className="text-sm text-blue-600 mt-1">
                    Reason: {safeData.error}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Status Alert */}
      {safeData.accountStatus.requirementsCount > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Account Setup Required</h3>
                <p className="text-sm text-yellow-700">
                  {safeData.accountStatus.requirementsCount} requirement(s) need attention to enable full functionality.
                </p>
                {safeData.accountStatus.currentlyDue.length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Currently due: {safeData.accountStatus.currentlyDue.join(", ")}
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
                  <span className="font-semibold">{formatCurrency(safeData.last30DaysEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>This Month Sales</span>
                  <span className="font-semibold">{formatNumber(safeData.salesMetrics.thisMonthSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last 30 Days Sales</span>
                  <span className="font-semibold">{formatNumber(safeData.salesMetrics.last30DaysSales)}</span>
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
                  <span className="font-semibold">{formatCurrency(safeData.pendingPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Balance</span>
                  <span className="font-semibold text-green-600">{formatCurrency(safeData.availableBalance)}</span>
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
              {safeData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {safeData.recentTransactions.slice(0, 10).map((transaction, index) => (
                    <div
                      key={transaction.id || index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
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
                  {safeData.accountStatus.chargesEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Payouts Enabled</span>
                  {safeData.accountStatus.payoutsEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Details Submitted</span>
                  {safeData.accountStatus.detailsSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Requirements</span>
                  <Badge variant={safeData.accountStatus.requirementsCount > 0 ? "destructive" : "default"}>
                    {safeData.accountStatus.requirementsCount} pending
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      {safeData.lastUpdated && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Last updated: {formatDateTime(safeData.lastUpdated)}
        </div>
      )}
    </div>
  )
}
