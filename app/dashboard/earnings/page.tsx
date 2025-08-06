"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle, Bug, Info, Loader2, ExternalLink, Globe, Shield, ArrowRight, Zap, Lock, BarChart3 } from 'lucide-react'
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">
            {authLoading ? "Loading..." : "Checking Stripe connection..."}
          </p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show Stripe connection setup if not connected or not fully set up
  if (!stripeStatus?.connected || !stripeStatus?.chargesEnabled || !stripeStatus?.detailsSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">Payment Setup</h1>
                <p className="text-sm text-gray-400 mt-1">Connect your Stripe account to start earning</p>
              </div>
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                Setup Required
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 py-12">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Connect Your Payment Account
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Integrate with Stripe to accept payments globally and track your earnings in real-time
            </p>
          </div>

          {/* Benefits */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-xl mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Accept Payments</h3>
                <p className="text-gray-400">Process payments from customers worldwide with enterprise-grade security</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
                <p className="text-gray-400">Supported in 40+ countries with local payment methods</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-xl mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Secure & Reliable</h3>
                <p className="text-gray-400">Bank-level security with PCI compliance and fraud protection</p>
              </div>
            </div>
          </div>

          {/* Connection Options */}
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create New Account */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Create New Account</CardTitle>
                      <CardDescription className="text-gray-400">Set up a new Stripe account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Quick 5-minute setup</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">2.9% + 30¢ per transaction</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Automatic payouts</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        setError(null)
                        const response = await fetch("/api/stripe/create-stripe-account", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: user.uid }),
                        })
                        const data = await response.json()
                        if (!response.ok) throw new Error(data.error || "Failed to create Stripe account")
                        if (data.url) window.location.href = data.url
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to create account")
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Connect Existing Account */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Connect Existing</CardTitle>
                      <CardDescription className="text-gray-400">Link your current Stripe account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Secure OAuth connection</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">No manual setup required</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Instant verification</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        setError(null)
                        const response = await fetch("/api/stripe/connect/oauth", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: user.uid }),
                        })
                        const data = await response.json()
                        if (!response.ok) throw new Error(data.error || "Failed to connect Stripe account")
                        if (data.authUrl) window.location.href = data.authUrl
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to connect account")
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-2xl mx-auto mt-8">
              <Card className="border-red-600/50 bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                  <Button 
                    onClick={() => setError(null)} 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-red-600/50 text-red-400 hover:bg-red-900/40"
                  >
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show loading while fetching earnings data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-white">Earnings</h1>
              <p className="text-gray-400">Loading your financial data...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-gray-800/50 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-700 animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
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
      return <Badge variant="destructive" className="bg-red-900/20 text-red-400 border-red-600/50">Error</Badge>
    }
    if (safeData.isDemo) {
      return <Badge variant="secondary" className="bg-yellow-900/20 text-yellow-400 border-yellow-600/50">Demo Data</Badge>
    }
    return <Badge variant="default" className="bg-green-900/20 text-green-400 border-green-600/50">Live Data</Badge>
  }

  // Account status badge
  const getAccountStatusBadge = () => {
    const { accountStatus } = safeData
    if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
      return <Badge variant="destructive" className="bg-red-900/20 text-red-400 border-red-600/50">Setup Required</Badge>
    }
    if (accountStatus.requirementsCount > 0) {
      return <Badge variant="secondary" className="bg-yellow-900/20 text-yellow-400 border-yellow-600/50">Action Required</Badge>
    }
    return <Badge variant="default" className="bg-green-900/20 text-green-400 border-green-600/50">Active</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Earnings</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-gray-400">Financial overview and performance metrics</p>
                {getDataSourceBadge()}
                {safeData.stripeAccountId && (
                  <Badge variant="outline" className="border-gray-600 text-gray-400">
                    {safeData.stripeAccountId.slice(-6)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {debugInfo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Debug
                </Button>
              )}
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing} 
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Debug Information Panel */}
        {debugInfo && showDebug && (
          <Card className="mb-8 border-blue-600/50 bg-blue-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Bug className="h-5 w-5" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debugInfo.logs && (
                  <div>
                    <h4 className="font-semibold mb-2 text-white">Execution Log:</h4>
                    <div className="bg-gray-800 p-3 rounded text-sm font-mono max-h-60 overflow-y-auto">
                      {debugInfo.logs.map((log: any, index: number) => (
                        <div key={index} className="mb-1 text-gray-300">
                          <span className="text-blue-400">[{log.step}]</span> {log.action}
                          {log.timestamp && <span className="text-gray-500 ml-2">({new Date(log.timestamp).toLocaleTimeString()})</span>}
                          {log.error && <span className="text-red-400 ml-2">ERROR: {log.error}</span>}
                          {log.data && (
                            <pre className="ml-4 text-xs text-gray-400">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-600/50 bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
              <Button 
                onClick={() => fetchEarningsData()} 
                className="mt-4 bg-red-600 hover:bg-red-700" 
                variant="default"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Earnings</CardTitle>
              <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeData.totalEarnings)}</div>
              <p className="text-xs text-gray-400 mt-1">All-time revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">This Month</CardTitle>
              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeData.thisMonthEarnings)}</div>
              <p className="text-xs text-gray-400 mt-1">{formatPercentage(monthlyGrowth)} from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Available Balance</CardTitle>
              <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeData.availableBalance)}</div>
              <p className="text-xs text-gray-400 mt-1">Ready for payout</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Sales</CardTitle>
              <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(safeData.salesMetrics.totalSales)}</div>
              <p className="text-xs text-gray-400 mt-1">
                {formatCurrency(safeData.salesMetrics.averageTransactionValue)} avg order
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Mode Notice */}
        {safeData.isDemo && (
          <Card className="mb-8 border-yellow-600/50 bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-yellow-400">Demo Mode Active</h3>
                  <p className="text-sm text-yellow-300 mt-1">
                    This is sample data for demonstration purposes. Connect your Stripe account to see real earnings.
                  </p>
                  {safeData.error && (
                    <p className="text-sm text-yellow-400 mt-1">
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
          <Card className="mb-8 border-yellow-600/50 bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-yellow-400">Account Setup Required</h3>
                  <p className="text-sm text-yellow-300 mt-1">
                    {safeData.accountStatus.requirementsCount} requirement(s) need attention to enable full functionality.
                  </p>
                  {safeData.accountStatus.currentlyDue.length > 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Currently due: {safeData.accountStatus.currentlyDue.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-800/50 border-gray-700">
            <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Performance</CardTitle>
                  <CardDescription className="text-gray-400">Your earnings breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Last 30 Days</span>
                    <span className="font-semibold text-white">{formatCurrency(safeData.last30DaysEarnings)}</span>
                  </div>
                  <Separator className="bg-gray-600" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">This Month Sales</span>
                    <span className="font-semibold text-white">{formatNumber(safeData.salesMetrics.thisMonthSales)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Last 30 Days Sales</span>
                    <span className="font-semibold text-white">{formatNumber(safeData.salesMetrics.last30DaysSales)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Payout Information</CardTitle>
                  <CardDescription className="text-gray-400">Balance and payout status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Payout</span>
                    <span className="font-semibold text-white">{formatCurrency(safeData.pendingPayout)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Available Balance</span>
                    <span className="font-semibold text-green-400">{formatCurrency(safeData.availableBalance)}</span>
                  </div>
                  <Separator className="bg-gray-600" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Account Status</span>
                    {getAccountStatusBadge()}
                  </div>
                  <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
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
                <CardDescription className="text-gray-400">Your latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {safeData.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {safeData.recentTransactions.slice(0, 10).map((transaction, index) => (
                      <div
                        key={transaction.id || index}
                        className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{transaction.description}</p>
                          <p className="text-sm text-gray-400">
                            {formatDateTime(transaction.created)} • {transaction.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatCurrency(transaction.net)}</p>
                          <p className="text-sm text-gray-400 flex items-center">
                            {transaction.status === "available" ? (
                              <CheckCircle className="inline h-3 w-3 text-green-400 mr-1" />
                            ) : (
                              <AlertCircle className="inline h-3 w-3 text-yellow-400 mr-1" />
                            )}
                            {transaction.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400">No transactions found</p>
                    <p className="text-sm text-gray-500 mt-1">Transactions will appear here once you start receiving payments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Health</CardTitle>
                <CardDescription className="text-gray-400">Your Stripe account status and capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300">Charges Enabled</span>
                    {safeData.accountStatus.chargesEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300">Payouts Enabled</span>
                    {safeData.accountStatus.payoutsEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300">Details Submitted</span>
                    {safeData.accountStatus.detailsSubmitted ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300">Requirements</span>
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
          <div className="mt-8 text-center text-sm text-gray-500">
            Last updated: {formatDateTime(safeData.lastUpdated)}
          </div>
        )}
      </div>
    </div>
  )
}
